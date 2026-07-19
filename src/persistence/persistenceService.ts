import { applyDurableOperation } from "../collaboration/hostState";
import { durableState, type CollaborationState, type DurableOperation, type DurableState } from "../collaboration/types";
import { ProjectCatalog, type OpfsProject } from "./projectCatalog";
import { decodeProjectArchive, encodeProjectArchive, loadNativeProject, loadProjectDirectory, saveNativeProject, saveProjectDirectory } from "./projectDocument";
import { RecoveryStore, type RecoveryResult } from "./recoveryStore";
import { ProjectAlreadyOpenError } from "./persistenceErrors";

type PersistedModel = { id: string; x?: number; y?: number };

export type PersistenceSession<T> = RecoveryResult<T> & {
  projects: OpfsProject[];
  activeProject: OpfsProject;
};

export type CatalogView = {
  projects: OpfsProject[];
  activeProject: OpfsProject;
};

type LockLease = { release(): void };
type LockManagerLike = {
  request<T>(name: string, options: { mode: "exclusive"; ifAvailable?: boolean }, callback: (lock: object | null) => Promise<T> | T): Promise<T>;
};

function restoreDurable<T extends PersistedModel>(state: DurableState<T>, operation: DurableOperation<T>) {
  const collaboration = { ...structuredClone(state), users: [], locks: {} } as CollaborationState<T>;
  return durableState(applyDurableOperation(collaboration, operation, "recovery", false));
}

function lockManager() {
  return (navigator as Navigator & { locks?: LockManagerLike }).locks;
}

async function acquireProjectLock(projectId: string): Promise<LockLease> {
  const locks = lockManager();
  if (!locks) return { release() {} };
  return new Promise<LockLease>((resolve, reject) => {
    void locks.request(`erdsketch:project:${projectId}`, { mode: "exclusive", ifAvailable: true }, async (lock) => {
      if (!lock) throw new ProjectAlreadyOpenError(projectId);
      await new Promise<void>((release) => resolve({ release }));
    }).catch(reject);
  });
}

async function withCatalogLock<T>(task: () => Promise<T>) {
  const locks = lockManager();
  if (!locks) return task();
  return locks.request("erdsketch:project-catalog", { mode: "exclusive" }, task);
}

export class PersistenceService<T extends PersistedModel> {
  private catalog: ProjectCatalog | null = null;
  private store: RecoveryStore<T> | null = null;
  private activeProjectId = "";
  private projectLock: LockLease | null = null;
  private lastRecovery: RecoveryResult<T> | null = null;

  async initialize(initialState: DurableState<T>, projectId?: string) {
    this.releaseProjectLock();
    this.catalog = await ProjectCatalog.open();
    const active = projectId
      ? this.catalog.list().find((project) => project.projectId === projectId)
      : this.catalog.active();
    if (!active) throw new Error("OPFS project was not found");
    const lock = await acquireProjectLock(active.projectId);
    try {
      const store = await RecoveryStore.open<T>(active.projectId);
      const recovered = await store.recover(initialState, restoreDurable);
      this.projectLock = lock;
      this.store = store;
      this.activeProjectId = active.projectId;
      this.lastRecovery = recovered;
      return this.session(recovered);
    } catch (error) {
      lock.release();
      throw error;
    }
  }

  async append(operation: DurableOperation<T>, messageId: string, expectedPreviousSequence: number) {
    const store = this.requireStore();
    if (store.hasMessage(messageId)) return { sequence: store.currentSequence(), shouldCheckpoint: store.shouldCheckpoint(), duplicate: true };
    const sequence = await store.append(operation, messageId, expectedPreviousSequence);
    return { sequence, shouldCheckpoint: store.shouldCheckpoint(), duplicate: false };
  }

  async checkpoint(state: DurableState<T>) {
    await this.requireStore().checkpoint(state);
  }

  hasMessage(messageId: string) {
    return this.requireStore().hasMessage(messageId);
  }

  async activateProject(projectId: string, currentState: DurableState<T>, initialState: DurableState<T>, checkpointCurrent = true) {
    if (projectId === this.activeProjectId) return this.session(this.requireRecovery());
    if (checkpointCurrent) await this.checkpoint(currentState);
    return this.switchProject(projectId, initialState);
  }

  async createProject(displayName: string, currentState: DurableState<T>, initialState: DurableState<T>) {
    await this.checkpoint(currentState);
    const created = await this.mutateCatalog((catalog) => catalog.createNamed(displayName));
    try {
      return await this.switchProject(created.projectId, initialState);
    } catch (error) {
      await this.mutateCatalog((catalog) => catalog.delete(created.projectId)).catch(() => undefined);
      throw error;
    }
  }

  async createProjectFromState(displayName: string, currentState: DurableState<T>, state: DurableState<T>) {
    await this.checkpoint(currentState);
    const created = await this.mutateCatalog((catalog) => catalog.createTemporary(displayName));
    try {
      const session = await this.switchProject(created.projectId, state);
      await this.checkpoint(state);
      return session;
    } catch (error) {
      if (this.activeProjectId !== created.projectId) await this.mutateCatalog((catalog) => catalog.delete(created.projectId)).catch(() => undefined);
      throw error;
    }
  }

  async saveAs(displayName: string, currentState: DurableState<T>) {
    await this.checkpoint(currentState);
    const created = await this.mutateCatalog((catalog) => catalog.createNamed(displayName));
    try {
      return await this.switchProject(created.projectId, currentState);
    } catch (error) {
      await this.mutateCatalog((catalog) => catalog.delete(created.projectId)).catch(() => undefined);
      throw error;
    }
  }

  async renameProject(projectId: string, displayName: string) {
    await this.mutateCatalog((catalog) => catalog.rename(projectId, displayName));
    return this.catalogView();
  }

  async deleteProject(projectId: string, currentState: DurableState<T>, initialState: DurableState<T>) {
    if (projectId === this.activeProjectId) {
      const projects = this.requireCatalog().list();
      let replacement = projects.find((project) => project.projectId !== projectId);
      if (!replacement) replacement = await this.mutateCatalog((catalog) => catalog.createTemporary());
      await this.checkpoint(currentState);
      await this.switchProject(replacement.projectId, initialState);
    }
    const deletionLock = await acquireProjectLock(projectId);
    try {
      await this.mutateCatalog((catalog) => catalog.delete(projectId));
    } finally {
      deletionLock.release();
    }
    return this.session(this.requireRecovery());
  }

  async touchProject(projectId: string) {
    await this.mutateCatalog((catalog) => catalog.touch(projectId));
    return this.catalogView();
  }

  loadNative(clientId: string, projectId: string) {
    return loadNativeProject<T>(clientId, projectId);
  }

  saveNative(clientId: string, projectId: string, state: DurableState<T>) {
    return saveNativeProject(clientId, projectId, state);
  }

  loadDirectory(directory: FileSystemDirectoryHandle, projectId: string) {
    return loadProjectDirectory<T>(directory, projectId);
  }

  saveDirectory(directory: FileSystemDirectoryHandle, projectId: string, state: DurableState<T>) {
    return saveProjectDirectory(directory, projectId, state);
  }

  async encodeArchive(projectId: string, state: DurableState<T>) {
    const bytes = await encodeProjectArchive(projectId, state);
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  }

  decodeArchive(buffer: ArrayBuffer) {
    return decodeProjectArchive<T>(new Blob([buffer]));
  }

  quota() {
    return this.requireStore().quota();
  }

  close() {
    this.releaseProjectLock();
    this.store = null;
  }

  private async switchProject(projectId: string, initialState: DurableState<T>) {
    const target = this.requireCatalog().list().find((project) => project.projectId === projectId);
    if (!target) throw new Error("OPFS project was not found");
    const nextLock = await acquireProjectLock(projectId);
    try {
      const nextStore = await RecoveryStore.open<T>(projectId);
      const recovered = await nextStore.recover(initialState, restoreDurable);
      await this.mutateCatalog((catalog) => catalog.setActive(projectId));
      this.releaseProjectLock();
      this.projectLock = nextLock;
      this.store = nextStore;
      this.activeProjectId = projectId;
      this.lastRecovery = recovered;
      return this.session(recovered);
    } catch (error) {
      nextLock.release();
      throw error;
    }
  }

  private async mutateCatalog<R>(task: (catalog: ProjectCatalog) => Promise<R>) {
    return withCatalogLock(async () => {
      const catalog = await ProjectCatalog.open();
      const result = await task(catalog);
      this.catalog = catalog;
      return result;
    });
  }

  private catalogView(): CatalogView {
    const projects = this.requireCatalog().list();
    const activeProject = projects.find((project) => project.projectId === this.activeProjectId);
    if (!activeProject) throw new Error("Active OPFS project is missing");
    return { projects, activeProject };
  }

  private session(recovered: RecoveryResult<T>): PersistenceSession<T> {
    return { ...recovered, ...this.catalogView() };
  }

  private requireCatalog() {
    if (!this.catalog) throw new Error("OPFS project catalog is not ready");
    return this.catalog;
  }

  private requireStore() {
    if (!this.store) throw new Error("Recovery storage is not ready");
    return this.store;
  }

  private requireRecovery() {
    if (!this.lastRecovery) throw new Error("Recovery storage is not ready");
    return this.lastRecovery;
  }

  private releaseProjectLock() {
    this.projectLock?.release();
    this.projectLock = null;
  }
}
