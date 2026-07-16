import assert from "node:assert/strict";
import test from "node:test";
import {
  beginParticipantCheckpointSession,
  clearParticipantCheckpoint,
  loadParticipantRecoveryCandidate,
  participantCheckpointStorageKeys,
  saveParticipantCheckpoint
} from "../src/collaboration/webrtc/participantCheckpoint.ts";

class FakeStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}

function snapshot() {
  return {
    canvases: [{ id: "main", name: "Main" }],
    placements: [],
    seeds: [{ id: "customer", x: 10, y: 20 }],
    relationships: [],
    relationshipReferences: [],
    domains: [],
    domainCategories: [],
    namingPolicy: {},
    vocabularyEntries: [],
    dfd: { canvases: [], nodes: [], flows: [], groups: [], crudMatrix: { orientation: "processes_rows", processOrder: [], modelOrder: [] } },
    users: [{ id: "host" }],
    locks: { customer: { id: "host" } },
    annotations: []
  };
}

test("participant checkpoint survives a same-tab reload and clears explicitly", () => {
  const sessionStorage = new FakeStorage();
  globalThis.window = { sessionStorage };
  beginParticipantCheckpointSession("Session01", "edit", "Customer model");
  assert.equal(loadParticipantRecoveryCandidate().checkpoint, undefined);

  const state = snapshot();
  assert.equal(saveParticipantCheckpoint(state, 42), true);
  state.seeds[0].id = "mutated-after-save";
  const recovered = loadParticipantRecoveryCandidate();
  assert.equal(recovered.marker.coworkSessionId, "Session01");
  assert.equal(recovered.marker.invitationLabel, "Customer model");
  assert.equal(recovered.checkpoint.sequence, 42);
  assert.equal(recovered.checkpoint.state.seeds[0].id, "customer");

  clearParticipantCheckpoint();
  assert.equal(loadParticipantRecoveryCandidate(), undefined);
  delete globalThis.window;
});

test("participant recovery refuses a corrupt or mismatched snapshot", () => {
  const sessionStorage = new FakeStorage();
  globalThis.window = { sessionStorage };
  beginParticipantCheckpointSession("Session02", "readonly");
  const marker = JSON.parse(sessionStorage.getItem(participantCheckpointStorageKeys.markerKey));
  sessionStorage.setItem(participantCheckpointStorageKeys.checkpointKey, JSON.stringify({ ...marker, coworkSessionId: "AnotherSession", sequence: 1, state: snapshot() }));
  const recovered = loadParticipantRecoveryCandidate();
  assert.ok(recovered.marker);
  assert.equal(recovered.checkpoint, undefined);
  clearParticipantCheckpoint();
  delete globalThis.window;
});

test("denied private storage never prevents joining or cleanup", () => {
  globalThis.window = { get sessionStorage() { throw new DOMException("denied", "SecurityError"); } };
  assert.doesNotThrow(() => beginParticipantCheckpointSession("Private01", "edit"));
  assert.equal(loadParticipantRecoveryCandidate(), undefined);
  assert.doesNotThrow(() => clearParticipantCheckpoint());
  delete globalThis.window;
});
