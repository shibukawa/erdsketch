import type { DurableOperation, DurableState } from "../collaboration/types";
import type { OpfsProject } from "./projectCatalog";
import { PersistenceService, type CatalogView, type PersistenceSession } from "./persistenceService";
import { PERSISTENCE_PROTOCOL_VERSION, type PersistenceOperation, type PersistenceRequest, type PersistenceResponse } from "./persistenceProtocol";

type PersistedModel = { id: string; x?: number; y?: number };

class PersistenceWorkerError extends Error {
  constructor(message: string, readonly code: string, readonly retryable: boolean) {
    super(message);
    this.name = "PersistenceWorkerError";
  }
}

type PendingRequest = {
  resolve(value: unknown): void;
  reject(error: unknown): void;
  timeout: number;
};

const WORKER_REQUEST_TIMEOUT_MS = 15_000;

interface PersistenceBackend {
  invoke(operation: PersistenceOperation, payload?: unknown, transfer?: Transferable[]): Promise<unknown>;
  dispose(): void;
}

class WorkerBackend implements PersistenceBackend {
  private readonly worker: Worker;
  private readonly pending = new Map<string, PendingRequest>();
  private failed = false;

  constructor() {
    this.worker = new Worker(new URL("./persistence.worker.ts", import.meta.url), { type: "module", name: "erdsketch-persistence" });
    this.worker.onmessage = (event: MessageEvent<PersistenceResponse>) => this.receive(event.data);
    this.worker.onerror = (event) => this.fail(new PersistenceWorkerError(event.message || "Persistence worker crashed", "WorkerCrashed", true), true);
    this.worker.onmessageerror = () => this.fail(new PersistenceWorkerError("Persistence worker message could not be decoded", "DataCloneError", true), true);
  }

  invoke(operation: PersistenceOperation, payload?: unknown, transfer: Transferable[] = []) {
    if (this.failed) return Promise.reject(new PersistenceWorkerError("Persistence worker is unavailable", "WorkerUnavailable", true));
    const requestId = crypto.randomUUID();
    const request: PersistenceRequest = { protocolVersion: PERSISTENCE_PROTOCOL_VERSION, requestId, operation, payload };
    return new Promise<unknown>((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        this.fail(new PersistenceWorkerError(`Persistence worker timed out during ${operation}`, "WorkerTimeout", true), true);
      }, WORKER_REQUEST_TIMEOUT_MS);
      this.pending.set(requestId, { resolve, reject, timeout });
      try {
        this.worker.postMessage(request, transfer);
      } catch (error) {
        window.clearTimeout(timeout);
        this.pending.delete(requestId);
        reject(error);
      }
    });
  }

  dispose() {
    if (!this.failed) void this.invoke("close").finally(() => this.worker.terminate());
    else this.worker.terminate();
    this.fail(new PersistenceWorkerError("Persistence worker was closed", "WorkerClosed", false));
  }

  private receive(response: PersistenceResponse) {
    const pending = this.pending.get(response.requestId);
    if (!pending) return;
    window.clearTimeout(pending.timeout);
    this.pending.delete(response.requestId);
    if (response.protocolVersion !== PERSISTENCE_PROTOCOL_VERSION) {
      pending.reject(new PersistenceWorkerError("Persistence protocol version mismatch", "ProtocolError", false));
    } else if (response.status === "success") {
      pending.resolve(response.result);
    } else {
      pending.reject(new PersistenceWorkerError(response.error?.message ?? "Persistence request failed", response.error?.code ?? "PersistenceError", response.error?.retryable ?? false));
    }
  }

  private fail(error: Error, terminate = false) {
    if (this.failed) return;
    this.failed = true;
    if (terminate) this.worker.terminate();
    for (const pending of this.pending.values()) {
      window.clearTimeout(pending.timeout);
      pending.reject(error);
    }
    this.pending.clear();
  }
}

class LocalBackend implements PersistenceBackend {
  private readonly service = new PersistenceService<PersistedModel>();
  private queue: Promise<unknown> = Promise.resolve();

  invoke(operation: PersistenceOperation, payload?: unknown) {
    const task = () => invokeService(this.service, operation, (payload ?? {}) as Record<string, unknown>);
    const result = this.queue.then(task, task);
    this.queue = result.then(() => undefined, () => undefined);
    return result;
  }

  dispose() {
    this.service.close();
  }
}

function durable(payload: Record<string, unknown>, key: string) {
  return payload[key] as DurableState<PersistedModel>;
}

function invokeService(service: PersistenceService<PersistedModel>, operation: PersistenceOperation, payload: Record<string, unknown>): Promise<unknown> | unknown {
  switch (operation) {
    case "initialize": return service.initialize(durable(payload, "initialState"));
    case "append": return service.append(payload.operation as DurableOperation<PersistedModel>, String(payload.messageId), Number(payload.expectedPreviousSequence));
    case "checkpoint": return service.checkpoint(durable(payload, "state"));
    case "has_message": return service.hasMessage(String(payload.messageId));
    case "activate_project": return service.activateProject(String(payload.projectId), durable(payload, "currentState"), durable(payload, "initialState"), payload.checkpointCurrent !== false);
    case "create_project": return service.createProject(String(payload.displayName), durable(payload, "currentState"), durable(payload, "initialState"));
    case "save_as": return service.saveAs(String(payload.displayName), durable(payload, "currentState"));
    case "rename_project": return service.renameProject(String(payload.projectId), String(payload.displayName));
    case "delete_project": return service.deleteProject(String(payload.projectId), durable(payload, "currentState"), durable(payload, "initialState"));
    case "touch_project": return service.touchProject(String(payload.projectId));
    case "load_native": return service.loadNative(String(payload.clientId), String(payload.projectId));
    case "save_native": return service.saveNative(String(payload.clientId), String(payload.projectId), durable(payload, "state"));
    case "load_directory": return service.loadDirectory(payload.directory as FileSystemDirectoryHandle, String(payload.projectId));
    case "save_directory": return service.saveDirectory(payload.directory as FileSystemDirectoryHandle, String(payload.projectId), durable(payload, "state"));
    case "encode_archive": return service.encodeArchive(String(payload.projectId), durable(payload, "state"));
    case "decode_archive": return service.decodeArchive(payload.buffer as ArrayBuffer);
    case "quota": return service.quota();
    case "close": return service.close();
  }
}

export class PersistenceClient<T extends PersistedModel> {
  private backend: PersistenceBackend;
  private usingWorker: boolean;

  constructor() {
    this.usingWorker = typeof Worker !== "undefined";
    try {
      this.backend = this.usingWorker ? new WorkerBackend() : new LocalBackend();
    } catch {
      this.backend = new LocalBackend();
      this.usingWorker = false;
    }
  }

  async initialize(initialState: DurableState<T>) {
    try {
      return await this.call<PersistenceSession<T>>("initialize", { initialState });
    } catch (error) {
      if (!this.usingWorker || !(error instanceof PersistenceWorkerError) || !["WorkerCrashed", "WorkerUnavailable", "WorkerTimeout", "DataCloneError"].includes(error.code)) throw error;
      this.backend.dispose();
      try {
        this.backend = new WorkerBackend();
        return await this.call<PersistenceSession<T>>("initialize", { initialState });
      } catch (restartError) {
        if (restartError instanceof PersistenceWorkerError && !["WorkerCrashed", "WorkerUnavailable", "WorkerTimeout", "DataCloneError"].includes(restartError.code)) throw restartError;
        this.backend.dispose();
        this.backend = new LocalBackend();
        this.usingWorker = false;
        return this.call<PersistenceSession<T>>("initialize", { initialState });
      }
    }
  }

  append(operation: DurableOperation<T>, messageId: string, expectedPreviousSequence: number) {
    return this.call<{ sequence: number; shouldCheckpoint: boolean; duplicate: boolean }>("append", { operation, messageId, expectedPreviousSequence });
  }

  checkpoint(state: DurableState<T>) { return this.call<void>("checkpoint", { state }); }
  hasMessage(messageId: string) { return this.call<boolean>("has_message", { messageId }); }
  activateProject(projectId: string, currentState: DurableState<T>, initialState: DurableState<T>, checkpointCurrent = true) { return this.call<PersistenceSession<T>>("activate_project", { projectId, currentState, initialState, checkpointCurrent }); }
  createProject(displayName: string, currentState: DurableState<T>, initialState: DurableState<T>) { return this.call<PersistenceSession<T>>("create_project", { displayName, currentState, initialState }); }
  saveAs(displayName: string, currentState: DurableState<T>) { return this.call<PersistenceSession<T>>("save_as", { displayName, currentState }); }
  renameProject(projectId: string, displayName: string) { return this.call<CatalogView>("rename_project", { projectId, displayName }); }
  deleteProject(projectId: string, currentState: DurableState<T>, initialState: DurableState<T>) { return this.call<PersistenceSession<T>>("delete_project", { projectId, currentState, initialState }); }
  touchProject(projectId: string) { return this.call<CatalogView>("touch_project", { projectId }); }
  loadNative(clientId: string, projectId: string) { return this.call<DurableState<T> | undefined>("load_native", { clientId, projectId }); }
  saveNative(clientId: string, projectId: string, state: DurableState<T>) { return this.call<void>("save_native", { clientId, projectId, state }); }
  loadDirectory(directory: FileSystemDirectoryHandle, projectId: string) { return this.call<DurableState<T>>("load_directory", { directory, projectId }); }
  saveDirectory(directory: FileSystemDirectoryHandle, projectId: string, state: DurableState<T>) { return this.call<void>("save_directory", { directory, projectId, state }); }
  encodeArchive(projectId: string, state: DurableState<T>) { return this.call<ArrayBuffer>("encode_archive", { projectId, state }); }

  async decodeArchive(file: Blob) {
    const buffer = await file.arrayBuffer();
    return this.call<DurableState<T>>("decode_archive", { buffer }, [buffer]);
  }

  quota() { return this.call<StorageEstimate>("quota"); }

  downloadArchive(projectId: string, state: DurableState<T>) {
    return this.encodeArchive(projectId, state).then((buffer) => {
      const url = URL.createObjectURL(new Blob([buffer], { type: "application/gzip" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${projectId}.erdsketch.txtar.gz`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    });
  }

  dispose() { this.backend.dispose(); }
  isWorkerBacked() { return this.usingWorker; }

  private call<R>(operation: PersistenceOperation, payload?: unknown, transfer?: Transferable[]) {
    return this.backend.invoke(operation, payload, transfer) as Promise<R>;
  }
}

export type { CatalogView, OpfsProject, PersistenceSession };
