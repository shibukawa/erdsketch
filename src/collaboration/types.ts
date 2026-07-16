import type { CanvasAnnotation, CanvasType } from "../features/annotations/types";
import type { CanvasModelPlacement, DataDomain, DfdState, DomainCategory, ErdCanvas, NamingPolicy, RefinementResult, Relationship, RelationshipReference, VocabularyEntry } from "../features/modeling/types";

export type Collaborator = {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  online: boolean;
  canvasId: string;
  canvasType?: CanvasType;
  selectionId?: string;
  editingAnnotationId?: string;
  editingModelId?: string;
};

export type CollaborationState<T> = {
  canvases: ErdCanvas[];
  placements: CanvasModelPlacement[];
  seeds: T[];
  relationships: Relationship[];
  relationshipReferences: RelationshipReference[];
  domains: DataDomain[];
  domainCategories: DomainCategory[];
  namingPolicy: NamingPolicy;
  vocabularyEntries: VocabularyEntry[];
  dfd: DfdState;
  users: Collaborator[];
  locks: Record<string, Collaborator>;
  annotations: CanvasAnnotation[];
};

export type DurableState<T> = Omit<CollaborationState<T>, "users" | "locks">;

export type DurableOperation<T> =
  | { type: "replace_project"; state: DurableState<T> }
  | { type: "seed"; seed: T; create: boolean; canvasId: string; catalog?: boolean }
  | { type: "placement"; placement: CanvasModelPlacement; create: boolean }
  | { type: "canvas"; canvas: ErdCanvas; create: boolean }
  | { type: "dfd"; dfd: DfdState }
  | { type: "ownership"; seedId: string; expectedOwnerId: string; targetCanvasId: string }
  | { type: "domain"; domain: DataDomain; create: boolean; delete: boolean }
  | { type: "domain_category"; category: DomainCategory; create: boolean }
  | { type: "naming_policy"; policy: NamingPolicy }
  | { type: "vocabulary"; entry: VocabularyEntry; create: boolean; delete: boolean }
  | { type: "relationship"; relationship: Relationship; reference: RelationshipReference; create: boolean; delete: boolean }
  | { type: "refinement"; result: RefinementResult }
  | { type: "annotation"; annotation: CanvasAnnotation; create: boolean; delete: boolean };

export type EphemeralOperation =
  | { type: "presence"; patch: Partial<Pick<Collaborator, "name" | "x" | "y" | "canvasId" | "canvasType" | "selectionId" | "editingAnnotationId" | "editingModelId">> }
  | { type: "lock"; seedIds: string[] }
  | { type: "unlock"; seedIds: string[] };

export type Operation<T> = DurableOperation<T> | EphemeralOperation;

export type RelayMessage<T> = {
  kind: "operation_intent" | "operation_accepted" | "operation_rejected" | "state_snapshot" | "participant_joined" | "participant_left" | "session_closing" | "transport_ping" | "transport_pong";
  messageId?: string;
  senderId: string;
  targetId?: string;
  payload?: {
    requestId?: string;
    sequence?: number;
    operation?: Operation<T>;
    state?: CollaborationState<T>;
    project?: { projectId: string; displayName: string; kind: "named" | "temporary"; createdAt: string; updatedAt: string };
    error?: string;
  } | Collaborator | { clientId: string } | { message?: string };
};

export type RelayJoinResult = {
  role: "host" | "participant";
  hostId: string;
  participants: Array<{ clientId: string; user: Collaborator }>;
};

export function durableState<T>(state: CollaborationState<T>): DurableState<T> {
  const { users: _users, locks: _locks, ...durable } = state;
  return structuredClone(durable);
}

export function withEphemeralState<T>(durable: DurableState<T>, current: CollaborationState<T>): CollaborationState<T> {
  return { ...structuredClone(durable), users: current.users, locks: current.locks };
}

export function isDurableOperation<T>(operation: Operation<T>): operation is DurableOperation<T> {
  return operation.type !== "presence" && operation.type !== "lock" && operation.type !== "unlock";
}
