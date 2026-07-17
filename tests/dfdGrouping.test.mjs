import assert from "node:assert/strict";
import test from "node:test";

import { groupAfterOverlapWithRestoration, ungroupDfd } from "../src/features/dfd/dfd.ts";

function node(id, kind, x, y) {
  return { id, definitionId: id, canvasId: "canvas", kind, name: id, x, y };
}

function state(flows) {
  return {
    canvases: [{ id: "canvas", name: "Canvas" }],
    nodes: [node("process-a", "process", 0, 0), node("process-b", "process", 10, 10), node("model-a", "model", 300, 0)],
    groups: [],
    flows
  };
}

test("ungroup restores the arrows from immediately before grouping when the expanded count is unchanged", () => {
  const original = state([{ id: "flow-a", canvasId: "canvas", sourceId: "process-a", destinationId: "model-a", label: "orders" }]);
  const grouped = groupAfterOverlapWithRestoration(original, "process-b");

  assert.ok(grouped.restoration);
  const restored = ungroupDfd(grouped.state, grouped.restoration.groupId, grouped.restoration);

  assert.deepEqual(restored.groups, []);
  assert.deepEqual(restored.flows.map(({ crudAssignments: _crudAssignments, ...flow }) => flow), original.flows);
});

test("ungroup falls back to one arrow per directed endpoint pair after grouped flows change", () => {
  const original = state([{ id: "flow-a", canvasId: "canvas", sourceId: "process-a", destinationId: "model-a" }]);
  const grouped = groupAfterOverlapWithRestoration(original, "process-b");
  assert.ok(grouped.restoration);
  const groupId = grouped.restoration.groupId;
  const changed = {
    ...grouped.state,
    flows: [
      ...grouped.state.flows,
      { id: "flow-b", canvasId: "canvas", sourceId: groupId, destinationId: "model-a", label: "changed" }
    ]
  };

  let nextId = 0;
  const restored = ungroupDfd(changed, groupId, grouped.restoration, () => `generated-${nextId++}`);
  const pairs = restored.flows.map((flow) => `${flow.sourceId}->${flow.destinationId}`);

  assert.deepEqual(pairs.sort(), ["process-a->model-a", "process-b->model-a"]);
  assert.equal(new Set(restored.flows.map((flow) => flow.id)).size, restored.flows.length);
});

test("ungroup keeps opposite directions as separate arrows", () => {
  const current = state([]);
  current.groups = [{ id: "group", canvasId: "canvas", kind: "process", memberIds: ["process-a", "process-b"] }];
  current.flows = [
    { id: "out", canvasId: "canvas", sourceId: "group", destinationId: "model-a" },
    { id: "in", canvasId: "canvas", sourceId: "model-a", destinationId: "group" }
  ];

  let nextId = 0;
  const restored = ungroupDfd(current, "group", undefined, () => `generated-${nextId++}`);
  const pairs = restored.flows.map((flow) => `${flow.sourceId}->${flow.destinationId}`).sort();

  assert.deepEqual(pairs, ["model-a->process-a", "model-a->process-b", "process-a->model-a", "process-b->model-a"]);
});
