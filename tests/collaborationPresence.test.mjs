import assert from "node:assert/strict";
import test from "node:test";
import { applyEphemeralOperation } from "../src/collaboration/hostState.ts";

function state() {
  return {
    canvases: [], placements: [], seeds: [{ id: "model-1", description: "committed" }],
    relationships: [], relationshipReferences: [], domains: [], domainCategories: [], namingPolicy: {}, vocabularyEntries: [],
    dfd: { canvases: [], nodes: [], flows: [], groups: [], crudMatrix: { orientation: "processes_rows", processOrder: [], modelOrder: [] } },
    users: [{ id: "participant", name: "Pat", color: "#2563eb", x: 0, y: 0, online: true, canvasId: "main" }],
    locks: {}, annotations: []
  };
}

test("model editing presence is transient and leaves committed model content untouched", () => {
  const initial = state();
  const editing = applyEphemeralOperation(initial, { type: "presence", patch: { editingModelId: "model-1" } }, "participant");
  assert.equal(editing.users[0].editingModelId, "model-1");
  assert.equal(editing.seeds[0].description, "committed");

  const finished = applyEphemeralOperation(editing, { type: "presence", patch: { editingModelId: "" } }, "participant");
  assert.equal(finished.users[0].editingModelId, "");
  assert.equal(finished.seeds[0].description, "committed");
});

test("lock owner display follows the collaborator's latest presence name", () => {
  const initial = state();
  const locked = applyEphemeralOperation(initial, { type: "lock", seedIds: ["model-1"] }, "participant");
  assert.equal(locked.locks["model-1"].name, "Pat");

  const renamed = applyEphemeralOperation(locked, { type: "presence", patch: { name: "Cursor name" } }, "participant");
  assert.equal(renamed.users[0].name, "Cursor name");
  assert.equal(renamed.locks["model-1"].name, "Cursor name");
});
