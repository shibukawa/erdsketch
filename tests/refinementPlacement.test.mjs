import assert from "node:assert/strict";
import test from "node:test";
import { applyDurableOperation, OperationError } from "../src/collaboration/hostState.ts";
import { MonotonicTimer, timestampDurableOperation } from "../src/collaboration/timestamp.ts";
import { buildRefinement, buildRefinementPlacements } from "../src/features/modeling/refinement.ts";
import { normalizePlacementOwnership } from "../src/features/modeling/placements.ts";
import { upgradeLegacyHistoryRelationship } from "../src/features/modeling/utils.ts";

const actor = { id: "owner", name: "Owner", color: "#000", x: 0, y: 0, online: true, canvasId: "main" };
const source = {
  id: "order", title: "Order", description: "Source", x: 20, y: 30, role: "transaction", dependency: "independent", hasPrivacy: false, maturedLevel: 6, rotation: 0,
  fields: [
    { id: "order-id", name: "id", primaryKey: true, important: true, domainId: "integer" },
    { id: "order-name", name: "name", primaryKey: false, important: true },
    { id: "order-status", name: "status", primaryKey: false, important: false, domainId: "status-code" }
  ]
};
const domains = [
  { id: "integer", name: "Integer", categoryId: "primitive", shape: "primitive", primitiveType: "integer", components: [], system: true },
  { id: "status-code", name: "Status", categoryId: "user-defined", shape: "primitive", primitiveType: "code_set", components: [], codeSetEntries: [{ id: "open", name: "Open", value: "open" }, { id: "closed", name: "Closed", value: "closed" }] }
];
const context = { seeds: [source], relationships: [], relationshipReferences: [], domains };

function input(patternId) {
  return {
    patternId,
    sourceId: source.id,
    selectedFieldIds: ["order-id", "order-name"],
    selectedRelationshipIds: [],
    modelName: `${patternId} model`,
    keyMode: "selected",
    keyFieldIds: ["order-id"],
    newKeyName: "id",
    keepSnapshot: false,
    cardinality: "1:N",
    ordered: false,
    orderFieldName: "position",
    historyStorage: "source",
    currentModelName: "Order Current",
    temporalMode: "instant",
    temporalNames: ["effective_at"],
    inheritParent: false,
    domainName: "Order Details",
    similarModelIds: [],
    codeSetModelNames: { open: "Open Order", closed: "Closed Order" }
  };
}

function build(patternId, patch = {}) {
  let id = 0;
  return buildRefinement({ ...input(patternId), ...patch }, context, () => `${patternId}-${id++}`);
}

test("every model-generating refinement creates a placement candidate for every new model", () => {
  const cases = [
    ["extract-master", {}, 1],
    ["multiple-items", {}, 1],
    ["extract-optional", {}, 1],
    ["extract-one-to-one", {}, 1],
    ["create-history", { selectedFieldIds: ["order-name"], historyStorage: "current" }, 2],
    ["create-work", { selectedFieldIds: [] }, 1],
    ["split-code-set", { selectedFieldIds: ["order-status"] }, 2],
    ["extract-domain", { selectedFieldIds: ["order-name"] }, 0]
  ];
  const currentPlacements = [{ canvasId: "main", seedId: source.id, x: 500, y: 250, accessMode: "owner" }];

  for (const [patternId, patch, expectedCount] of cases) {
    const result = build(patternId, patch);
    const placements = buildRefinementPlacements(result, "main", currentPlacements);
    assert.equal(result.createdSeedIds.length, expectedCount, patternId);
    assert.equal(placements.length, expectedCount, patternId);
    assert.ok(placements.every((placement) => placement.canvasId === "main" && placement.accessMode === "owner"), patternId);
  }
});

test("history refinement creates an editable one-to-many relationship from source to history", () => {
  const result = build("create-history", { selectedFieldIds: ["order-name"] });
  const historyId = result.createdSeedIds[0];
  const historyRelationship = result.relationships.find((relationship) => relationship.name === "history");

  assert.deepEqual(historyRelationship, {
    id: "create-history-2",
    name: "history",
    sourceId: source.id,
    targetId: historyId,
    sourceMultiplicity: "1",
    targetMultiplicity: "1..*",
    direction: "source-to-target",
    kind: "foreign-key"
  });
});

test("legacy history labels become editable one-to-many relationships", () => {
  const history = { ...source, id: "order-history", title: "Order History", role: "history" };
  const upgraded = upgradeLegacyHistoryRelationship({
    id: "legacy-history",
    name: "history",
    sourceId: history.id,
    targetId: source.id,
    sourceMultiplicity: "0..*",
    targetMultiplicity: "1",
    direction: "source-to-target",
    kind: "label"
  }, history, source);

  assert.deepEqual(upgraded, {
    id: "legacy-history",
    name: "history",
    sourceId: source.id,
    targetId: history.id,
    sourceMultiplicity: "1",
    targetMultiplicity: "1..*",
    direction: "source-to-target",
    kind: "foreign-key",
    onDelete: "no_action"
  });
});

test("refined model positions follow the source owner placement instead of stale model coordinates", () => {
  const result = build("extract-master");
  const [placement] = buildRefinementPlacements(result, "main", [{ canvasId: "main", seedId: source.id, x: 500, y: 250, accessMode: "owner" }]);
  assert.deepEqual({ x: placement.x, y: placement.y }, { x: 850, y: 250 });
});

test("host applies refinement models and owner placements atomically", () => {
  const result = build("extract-master");
  result.createdPlacements = buildRefinementPlacements(result, "main", [{ canvasId: "main", seedId: source.id, x: 500, y: 250, accessMode: "owner" }]);
  const state = {
    canvases: [{ id: "main", name: "Main" }],
    placements: [{ canvasId: "main", seedId: source.id, x: 500, y: 250, accessMode: "owner" }],
    seeds: [source], relationships: [], relationshipReferences: [], domains, domainCategories: [], namingPolicy: {}, exportSettings: {}, vocabularyEntries: [],
    dfd: { canvases: [], nodes: [], flows: [], groups: [], crudMatrix: { orientation: "processes_rows", processOrder: [], modelOrder: [] } },
    users: [actor], locks: { [source.id]: actor }, annotations: []
  };
  const next = applyDurableOperation(state, { type: "refinement", result }, actor.id);
  assert.deepEqual(next.placements.filter((placement) => result.createdSeedIds.includes(placement.seedId)).map((placement) => placement.accessMode), ["owner"]);
  assert.ok(next.seeds.some((seed) => seed.id === result.createdSeedIds[0]));

  assert.throws(() => applyDurableOperation(state, { type: "refinement", result: { ...result, createdPlacements: [] } }, actor.id), OperationError);
});

test("host timestamps refined placements in the same operation", () => {
  const result = build("extract-master");
  result.createdPlacements = buildRefinementPlacements(result, "main", [{ canvasId: "main", seedId: source.id, x: 500, y: 250, accessMode: "owner" }]);
  const state = {
    canvases: [{ id: "main", name: "Main" }], placements: [{ canvasId: "main", seedId: source.id, x: 500, y: 250, accessMode: "owner" }], seeds: [source],
    relationships: [], relationshipReferences: [], domains, domainCategories: [], namingPolicy: {}, exportSettings: {}, vocabularyEntries: [],
    dfd: { canvases: [], nodes: [], flows: [], groups: [] }, users: [actor], locks: { [source.id]: actor }, annotations: []
  };
  const operation = timestampDurableOperation(state, { type: "refinement", result }, new MonotonicTimer());
  assert.match(operation.result.createdPlacements[0].timestamp, /^[0-9a-z]{9}$/);
});

test("readonly placement position changes do not require a model-definition lock", () => {
  const state = {
    canvases: [{ id: "main", name: "Main" }, { id: "other", name: "Other" }],
    placements: [{ canvasId: "main", seedId: source.id, x: 0, y: 0, accessMode: "owner" }, { canvasId: "other", seedId: source.id, x: 10, y: 20, accessMode: "readonly" }],
    seeds: [source], relationships: [], relationshipReferences: [], domains, domainCategories: [], namingPolicy: {}, exportSettings: {}, vocabularyEntries: [],
    dfd: { canvases: [], nodes: [], flows: [], groups: [], crudMatrix: { orientation: "processes_rows", processOrder: [], modelOrder: [] } },
    users: [actor], locks: {}, annotations: []
  };
  const next = applyDurableOperation(state, { type: "placement", placement: { canvasId: "other", seedId: source.id, x: 90, y: 80, accessMode: "readonly" }, create: false }, actor.id);
  assert.deepEqual(next.placements.find((placement) => placement.canvasId === "other"), { canvasId: "other", seedId: source.id, x: 90, y: 80, accessMode: "readonly" });
});

test("legacy placed models with no owner recover exactly one owner placement", () => {
  const normalized = normalizePlacementOwnership([
    { canvasId: "main", seedId: "orphan", x: 10, y: 20, accessMode: "readonly" },
    { canvasId: "other", seedId: "orphan", x: 30, y: 40, accessMode: "readonly" },
    { canvasId: "main", seedId: "healthy", x: 50, y: 60, accessMode: "owner" }
  ]);
  assert.deepEqual(normalized.filter((placement) => placement.seedId === "orphan").map((placement) => placement.accessMode), ["owner", "readonly"]);
  assert.equal(normalized.find((placement) => placement.seedId === "healthy")?.accessMode, "owner");
});
