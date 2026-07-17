import assert from "node:assert/strict";
import test from "node:test";
import { applyDurableOperation, OperationError } from "../src/collaboration/hostState.ts";

const actor = { id: "owner", name: "Owner", color: "#000", x: 0, y: 0, online: true, canvasId: "owner-canvas" };
const model = (id) => ({ id, title: id, description: "described", fields: [{ id: `${id}-id`, name: "id", primaryKey: true, important: true, domainId: "integer" }], x: 0, y: 0, role: "transaction", dependency: "independent", hasPrivacy: false, maturedLevel: 6, rotation: 0 });

function state() {
  return {
    canvases: [{ id: "owner-canvas", name: "Owner" }, { id: "other-canvas", name: "Other" }],
    placements: [
      { canvasId: "owner-canvas", seedId: "order", x: 0, y: 0, accessMode: "owner" },
      { canvasId: "other-canvas", seedId: "order", x: 10, y: 10, accessMode: "readonly" },
      { canvasId: "owner-canvas", seedId: "customer", x: 100, y: 0, accessMode: "owner" }
    ],
    seeds: [model("order"), model("customer")],
    relationships: [{ id: "rel", name: "customer order", sourceId: "customer", targetId: "order", sourceMultiplicity: "1", targetMultiplicity: "0..*", direction: "source-to-target", kind: "foreign-key" }],
    relationshipReferences: [{ id: "rel-ref", relationshipId: "rel", primaryKey: false, foreignKey: true, hiddenOnModelIds: [] }],
    domains: [{ id: "integer", name: "Integer", categoryId: "primitive", shape: "primitive", components: [], system: true }], domainCategories: [], namingPolicy: {}, vocabularyEntries: [],
    dfd: {
      canvases: [{ id: "dfd", name: "DFD" }],
      nodes: [{ id: "order-node", definitionId: "order", canvasId: "dfd", kind: "model", name: "order", modelId: "order", x: 0, y: 0 }, { id: "process", definitionId: "process", canvasId: "dfd", kind: "process", name: "process", x: 10, y: 10 }],
      flows: [{ id: "flow", canvasId: "dfd", sourceId: "process", destinationId: "order-node", crudAssignments: [{ processUnitId: "process", modelId: "order", operations: ["C"] }] }],
      groups: [], crudMatrix: { orientation: "processes_rows", processOrder: ["process"], modelOrder: ["order", "customer"] }
    },
    users: [actor], locks: {}, annotations: [{ id: "note", canvasType: "erd", canvasId: "owner-canvas", kind: "sticky_note", start: { x: 0, y: 0, itemId: "order", itemKind: "model" }, color: "yellow", strokeWidth: 1, layer: "annotation" }]
  };
}

test("readonly removal deletes only the current canvas placement", () => {
  const next = applyDurableOperation(state(), { type: "remove_model", seedId: "order", canvasId: "other-canvas" }, actor.id);
  assert.deepEqual(next.seeds.map((seed) => seed.id), ["order", "customer"]);
  assert.deepEqual(next.placements.filter((placement) => placement.seedId === "order").map((placement) => placement.canvasId), ["owner-canvas"]);
  assert.equal(next.relationships.length, 1);
  assert.equal(next.dfd.nodes.length, 2);
});

test("owner removal requires a lock and deletes project-wide references atomically", () => {
  assert.throws(() => applyDurableOperation(state(), { type: "remove_model", seedId: "order", canvasId: "owner-canvas" }, actor.id), OperationError);
  const locked = { ...state(), locks: { order: actor } };
  const next = applyDurableOperation(locked, { type: "remove_model", seedId: "order", canvasId: "owner-canvas" }, actor.id);
  assert.deepEqual(next.seeds.map((seed) => seed.id), ["customer"]);
  assert.equal(next.placements.some((placement) => placement.seedId === "order"), false);
  assert.equal(next.relationships.length, 0);
  assert.equal(next.relationshipReferences.length, 0);
  assert.deepEqual(next.dfd.nodes.map((node) => node.id), ["process"]);
  assert.equal(next.dfd.flows.length, 0);
  assert.deepEqual(next.dfd.crudMatrix.modelOrder, ["customer"]);
  assert.equal(next.annotations.length, 0);
  assert.equal(next.locks.order, undefined);
});
