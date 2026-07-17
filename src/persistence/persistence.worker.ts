/// <reference lib="webworker" />

import type { DurableOperation, DurableState } from "../collaboration/types";
import { PersistenceService } from "./persistenceService";
import { PERSISTENCE_PROTOCOL_VERSION, persistenceError, type PersistenceRequest, type PersistenceResponse } from "./persistenceProtocol";

type PersistedModel = { id: string; x?: number; y?: number };
type WorkerPayload = Record<string, unknown>;

const context = self as DedicatedWorkerGlobalScope;
const service = new PersistenceService<PersistedModel>();
let queue: Promise<void> = Promise.resolve();

function state(payload: WorkerPayload, key: string) {
  return payload[key] as DurableState<PersistedModel>;
}

async function execute(request: PersistenceRequest) {
  const payload = (request.payload ?? {}) as WorkerPayload;
  switch (request.operation) {
    case "initialize":
      return service.initialize(state(payload, "initialState"));
    case "append":
      return service.append(payload.operation as DurableOperation<PersistedModel>, String(payload.messageId), Number(payload.expectedPreviousSequence));
    case "checkpoint":
      return service.checkpoint(state(payload, "state"));
    case "has_message":
      return service.hasMessage(String(payload.messageId));
    case "activate_project":
      return service.activateProject(String(payload.projectId), state(payload, "currentState"), state(payload, "initialState"), payload.checkpointCurrent !== false);
    case "create_project":
      return service.createProject(String(payload.displayName), state(payload, "currentState"), state(payload, "initialState"));
    case "create_project_from_state":
      return service.createProjectFromState(String(payload.displayName), state(payload, "currentState"), state(payload, "state"));
    case "save_as":
      return service.saveAs(String(payload.displayName), state(payload, "currentState"));
    case "rename_project":
      return service.renameProject(String(payload.projectId), String(payload.displayName));
    case "delete_project":
      return service.deleteProject(String(payload.projectId), state(payload, "currentState"), state(payload, "initialState"));
    case "touch_project":
      return service.touchProject(String(payload.projectId));
    case "load_native":
      return service.loadNative(String(payload.clientId), String(payload.projectId));
    case "save_native":
      return service.saveNative(String(payload.clientId), String(payload.projectId), state(payload, "state"));
    case "load_directory":
      return service.loadDirectory(payload.directory as FileSystemDirectoryHandle, String(payload.projectId));
    case "save_directory":
      return service.saveDirectory(payload.directory as FileSystemDirectoryHandle, String(payload.projectId), state(payload, "state"));
    case "encode_archive":
      return service.encodeArchive(String(payload.projectId), state(payload, "state"));
    case "decode_archive":
      return service.decodeArchive(payload.buffer as ArrayBuffer);
    case "quota":
      return service.quota();
    case "close":
      return service.close();
  }
}

function transferFor(result: unknown): Transferable[] {
  return result instanceof ArrayBuffer ? [result] : [];
}

async function handle(request: PersistenceRequest) {
  if (request.protocolVersion !== PERSISTENCE_PROTOCOL_VERSION) throw new Error(`Unsupported persistence protocol: ${request.protocolVersion}`);
  try {
    const result = await execute(request);
    const response: PersistenceResponse = { protocolVersion: PERSISTENCE_PROTOCOL_VERSION, requestId: request.requestId, status: "success", result };
    context.postMessage(response, transferFor(result));
  } catch (error) {
    const response: PersistenceResponse = { protocolVersion: PERSISTENCE_PROTOCOL_VERSION, requestId: request.requestId, status: "error", error: persistenceError(error) };
    context.postMessage(response);
  }
}

context.onmessage = (event: MessageEvent<PersistenceRequest>) => {
  const task = () => handle(event.data);
  queue = queue.then(task, task);
};
