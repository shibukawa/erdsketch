import type { CollaborationState } from "../types";

const markerKey = "erdsketch.cowork.participant.marker.v1";
const checkpointKey = "erdsketch.cowork.participant.checkpoint.v1";
const formatVersion = 1;

export type ParticipantCheckpointMarker = {
  formatVersion: 1;
  tabSessionId: string;
  coworkSessionId: string;
  invitationLabel?: string;
  access: "edit" | "readonly";
  updatedAt: number;
};

export type ParticipantCheckpoint<T> = ParticipantCheckpointMarker & {
  state: CollaborationState<T>;
  sequence: number;
  project?: { projectId: string; displayName: string; kind: "named" | "temporary"; createdAt: string; updatedAt: string };
};

export type ParticipantRecoveryCandidate<T> = {
  marker: ParticipantCheckpointMarker;
  checkpoint?: ParticipantCheckpoint<T>;
};

function storage() {
  if (typeof window === "undefined") return undefined;
  try {
    return window.sessionStorage;
  } catch {
    return undefined;
  }
}

function readJson(key: string) {
  let value: string | null | undefined;
  try {
    value = storage()?.getItem(key);
  } catch {
    return undefined;
  }
  if (!value) return undefined;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return undefined;
  }
}

function validMarker(value: unknown): value is ParticipantCheckpointMarker {
  if (!value || typeof value !== "object") return false;
  const marker = value as Partial<ParticipantCheckpointMarker>;
  return marker.formatVersion === formatVersion
    && typeof marker.tabSessionId === "string" && Boolean(marker.tabSessionId)
    && typeof marker.coworkSessionId === "string" && Boolean(marker.coworkSessionId)
    && (marker.access === "edit" || marker.access === "readonly")
    && typeof marker.updatedAt === "number" && Number.isFinite(marker.updatedAt)
    && (marker.invitationLabel === undefined || typeof marker.invitationLabel === "string");
}

function validCheckpoint<T>(value: unknown, marker: ParticipantCheckpointMarker): value is ParticipantCheckpoint<T> {
  if (!validMarker(value)) return false;
  const checkpoint = value as Partial<ParticipantCheckpoint<T>>;
  if (checkpoint.tabSessionId !== marker.tabSessionId || checkpoint.coworkSessionId !== marker.coworkSessionId) return false;
  if (!Number.isSafeInteger(checkpoint.sequence) || (checkpoint.sequence ?? -1) < 0 || !checkpoint.state || typeof checkpoint.state !== "object") return false;
  const state = checkpoint.state as Partial<CollaborationState<T>>;
  return Array.isArray(state.seeds) && Array.isArray(state.canvases) && Array.isArray(state.placements)
    && Array.isArray(state.relationships) && Array.isArray(state.users) && Boolean(state.dfd);
}

export function beginParticipantCheckpointSession(coworkSessionId: string, access: "edit" | "readonly", invitationLabel?: string) {
  const target = storage();
  if (!target) return;
  const marker: ParticipantCheckpointMarker = {
    formatVersion,
    tabSessionId: crypto.randomUUID(),
    coworkSessionId,
    ...(invitationLabel ? { invitationLabel } : {}),
    access,
    updatedAt: Date.now()
  };
  try {
    target.setItem(markerKey, JSON.stringify(marker));
    target.removeItem(checkpointKey);
  } catch {
    // Recovery is best effort and must never prevent joining Co-work.
  }
}

export function saveParticipantCheckpoint<T>(state: CollaborationState<T>, sequence: number, project?: ParticipantCheckpoint<T>["project"]) {
  const target = storage();
  const marker = readJson(markerKey);
  if (!target || !validMarker(marker)) return false;
  const updatedAt = Date.now();
  try {
    const checkpoint: ParticipantCheckpoint<T> = {
      ...marker,
      updatedAt,
      sequence,
      state: structuredClone(state),
      ...(project ? { project: structuredClone(project) } : {})
    };
    target.setItem(checkpointKey, JSON.stringify(checkpoint));
    target.setItem(markerKey, JSON.stringify({ ...marker, updatedAt }));
    return true;
  } catch {
    return false;
  }
}

export function loadParticipantRecoveryCandidate<T>(): ParticipantRecoveryCandidate<T> | undefined {
  const marker = readJson(markerKey);
  if (!validMarker(marker)) return undefined;
  const checkpoint = readJson(checkpointKey);
  return { marker, ...(validCheckpoint<T>(checkpoint, marker) ? { checkpoint } : {}) };
}

export function clearParticipantCheckpoint() {
  const target = storage();
  try {
    target?.removeItem(markerKey);
    target?.removeItem(checkpointKey);
  } catch {
    // Private browsing policies may deny storage cleanup after a session ends.
  }
}

export const participantCheckpointStorageKeys = { markerKey, checkpointKey };
