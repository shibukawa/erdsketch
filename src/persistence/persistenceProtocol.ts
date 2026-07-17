export const PERSISTENCE_PROTOCOL_VERSION = 1 as const;

export type PersistenceOperation =
  | "initialize"
  | "append"
  | "checkpoint"
  | "has_message"
  | "activate_project"
  | "create_project"
  | "create_project_from_state"
  | "save_as"
  | "rename_project"
  | "delete_project"
  | "touch_project"
  | "load_native"
  | "save_native"
  | "load_directory"
  | "save_directory"
  | "encode_archive"
  | "decode_archive"
  | "quota"
  | "close";

export type PersistenceRequest = {
  protocolVersion: typeof PERSISTENCE_PROTOCOL_VERSION;
  requestId: string;
  operation: PersistenceOperation;
  payload?: unknown;
};

export type PersistenceResponse = {
  protocolVersion: typeof PERSISTENCE_PROTOCOL_VERSION;
  requestId: string;
  status: "success" | "error";
  result?: unknown;
  error?: {
    code: string;
    retryable: boolean;
    message: string;
  };
};

export function persistenceError(error: unknown): NonNullable<PersistenceResponse["error"]> {
  const name = error instanceof DOMException ? error.name : error instanceof Error ? error.name : "PersistenceError";
  const message = error instanceof Error ? error.message : String(error);
  return {
    code: name || "PersistenceError",
    retryable: !["DataError", "NotAllowedError", "SecurityError", "TypeError"].includes(name),
    message
  };
}
