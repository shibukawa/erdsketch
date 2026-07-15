export function storageManager() {
  return navigator.storage as StorageManager & {
    getDirectory?: () => Promise<FileSystemDirectoryHandle>;
    persist?: () => Promise<boolean>;
  };
}

export async function getAppDirectory() {
  const manager = storageManager();
  if (!manager.getDirectory) throw new Error("Origin-private file system is unavailable");
  const root = await manager.getDirectory();
  return root.getDirectoryHandle("erdsketch", { create: true });
}

export async function getProjectsDirectory() {
  return (await getAppDirectory()).getDirectoryHandle("projects", { create: true });
}

export async function getProjectDirectory(projectId: string) {
  return (await getProjectsDirectory()).getDirectoryHandle(projectId, { create: true });
}

export async function readText(directory: FileSystemDirectoryHandle, name: string) {
  try {
    const handle = await directory.getFileHandle(name);
    const syncHandle = await openSyncAccessHandle(handle);
    if (syncHandle) {
      try {
        const bytes = new Uint8Array(syncHandle.getSize());
        syncHandle.read(bytes, { at: 0 });
        return new TextDecoder().decode(bytes);
      } finally {
        syncHandle.close();
      }
    }
    return await (await handle.getFile()).text();
  } catch (error) {
    if (error instanceof DOMException && error.name === "NotFoundError") return undefined;
    throw error;
  }
}

export async function writeText(directory: FileSystemDirectoryHandle, name: string, text: string) {
  const handle = await directory.getFileHandle(name, { create: true });
  const syncHandle = await openSyncAccessHandle(handle);
  if (syncHandle) {
    try {
      const bytes = new TextEncoder().encode(text);
      syncHandle.truncate(0);
      syncHandle.write(bytes, { at: 0 });
      syncHandle.flush();
    } finally {
      syncHandle.close();
    }
    return;
  }
  const writable = await handle.createWritable();
  await writable.write(text);
  await writable.close();
}

export async function appendText(directory: FileSystemDirectoryHandle, name: string, text: string) {
  const handle = await directory.getFileHandle(name, { create: true });
  const syncHandle = await openSyncAccessHandle(handle);
  if (syncHandle) {
    try {
      syncHandle.write(new TextEncoder().encode(text), { at: syncHandle.getSize() });
      syncHandle.flush();
    } finally {
      syncHandle.close();
    }
    return;
  }
  const existing = await handle.getFile();
  const writable = await handle.createWritable({ keepExistingData: true });
  await writable.seek(existing.size);
  await writable.write(text);
  await writable.close();
}

type SyncAccessHandle = {
  close(): void;
  flush(): void;
  getSize(): number;
  read(buffer: ArrayBufferView, options?: { at?: number }): number;
  truncate(size: number): void;
  write(buffer: ArrayBufferView, options?: { at?: number }): number;
};

async function openSyncAccessHandle(handle: FileSystemFileHandle) {
  const candidate = handle as FileSystemFileHandle & { createSyncAccessHandle?: () => Promise<SyncAccessHandle> };
  if (!candidate.createSyncAccessHandle || typeof WorkerGlobalScope === "undefined" || !(globalThis instanceof WorkerGlobalScope)) return undefined;
  try {
    return await candidate.createSyncAccessHandle();
  } catch (error) {
    if (error instanceof DOMException && ["InvalidStateError", "NotAllowedError", "NoModificationAllowedError"].includes(error.name)) return undefined;
    throw error;
  }
}

export async function removeProjectDirectory(projectId: string) {
  const projects = await getProjectsDirectory();
  try {
    await projects.removeEntry(projectId, { recursive: true });
  } catch (error) {
    if (error instanceof DOMException && error.name === "NotFoundError") return;
    throw error;
  }
}
