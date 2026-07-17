import assert from "node:assert/strict";
import test from "node:test";
import { applyDurableOperation, OperationError } from "../src/collaboration/hostState.ts";
import { compositionProjection } from "../src/features/modeling/physicalDesign.ts";
import { getCompositionDiamondPath, normalizeRelationshipSemantics, relationshipDisplaySeedIDs } from "../src/features/modeling/utils.ts";

const composition = {
  id: "order-lines",
  name: " lines ",
  sourceId: "order",
  targetId: "line",
  sourceMultiplicity: "1",
  targetMultiplicity: "1..*",
  direction: "source-to-target",
  kind: "composition",
  onDelete: "restrict"
};

test("composition normalizes lifecycle semantics and projects the owner field", () => {
  const normalized = normalizeRelationshipSemantics(composition);
  assert.equal(normalized.name, "lines");
  assert.equal(normalized.onDelete, "cascade");
  assert.deepEqual(relationshipDisplaySeedIDs(normalized), ["order"]);
  assert.deepEqual(compositionProjection(normalized), {
    relationshipId: "order-lines",
    ownerModelId: "order",
    childModelId: "line",
    fieldName: "lines",
    relational: { foreignKeyFromModelId: "line", foreignKeyToModelId: "order", onDelete: "cascade" },
    document: { fieldName: "lines", value: "child-object-array" },
    searchIndex: { fieldName: "lines", value: "child-object-array" }
  });
});

test("composition geometry includes a filled-diamond path at the source owner", () => {
  const seeds = [
    { id: "order", x: 0, y: 0, maturedLevel: 1 },
    { id: "line", x: 500, y: 0, maturedLevel: 1 }
  ];
  const path = getCompositionDiamondPath(normalizeRelationshipSemantics(composition), seeds);
  assert.match(path, /^M300 97 L/);
  assert.match(path, / Z$/);
});

test("host collaboration keeps one composition owner per child", () => {
  const actor = { id: "owner", name: "Owner" };
  const state = {
    canvases: [], placements: [], seeds: [{ id: "order" }, { id: "line" }, { id: "cart" }],
    relationships: [], relationshipReferences: [], domains: [], domainCategories: [], namingPolicy: {}, vocabularyEntries: [],
    dfd: { canvases: [], nodes: [], flows: [], groups: [], crudMatrix: { orientation: "processes_rows", processOrder: [], modelOrder: [] } },
    users: [actor], locks: { order: actor, line: actor, cart: actor }, annotations: []
  };
  const created = applyDurableOperation(state, {
    type: "relationship",
    relationship: composition,
    reference: { id: "order-lines-reference", relationshipId: composition.id, primaryKey: false, foreignKey: false, hiddenOnModelIds: [] },
    create: true,
    delete: false
  }, actor.id);
  assert.equal(created.relationships[0].onDelete, "cascade");

  assert.throws(() => applyDurableOperation(created, {
    type: "relationship",
    relationship: { ...composition, id: "cart-lines", name: "items", sourceId: "cart" },
    reference: { id: "cart-lines-reference", relationshipId: "cart-lines", primaryKey: false, foreignKey: false, hiddenOnModelIds: [] },
    create: true,
    delete: false
  }, actor.id), OperationError);
});
