import assert from "node:assert/strict";
import test from "node:test";
import { assessModelMaturity, defaultModelDescription } from "../src/features/modeling/maturity.ts";
import { resolveVocabularyBinding } from "../src/features/modeling/vocabulary.ts";
import { applyDurableOperation } from "../src/collaboration/hostState.ts";

const completeVocabulary = [
  { id: "order", businessName: "Order", systemName: "Order", physicalName: "order", meaning: "", memo: "", aliases: [] },
  { id: "id", businessName: "Id", systemName: "Id", physicalName: "id", meaning: "", memo: "", aliases: [] },
  { id: "identifier", businessName: "Identifier", systemName: "Identifier", physicalName: "identifier", meaning: "", memo: "", aliases: [] }
];
const domain = { id: "identifier-domain", name: "Identifier", vocabularyBinding: resolveVocabularyBinding("Identifier", completeVocabulary), categoryId: "user", shape: "scalar", components: [] };

function model(patch = {}) {
  return {
    id: "order-model", title: "Order", vocabularyBinding: resolveVocabularyBinding("Order", completeVocabulary), description: "Orders placed by customers.",
    fields: [{ id: "order-id", name: "Id", vocabularyBinding: resolveVocabularyBinding("Id", completeVocabulary), primaryKey: true, important: true, domainId: domain.id }],
    x: 0, y: 0, role: "transaction", dependency: "independent", hasPrivacy: false, maturedLevel: 6, rotation: 0,
    ...patch
  };
}

test("maturity uses the least complete matching stage", () => {
  const seed = assessModelMaturity(model({ title: "Model Seed 1", description: defaultModelDescription, fields: [] }), [domain], completeVocabulary);
  assert.equal(seed.stage, "seed");
  assert.deepEqual(seed.issues.map((issue) => issue.kind), ["default-model-name", "default-model-description", "missing-primary-key"]);

  const concept = assessModelMaturity(model({ fields: [{ ...model().fields[0], domainId: undefined }] }), [domain], completeVocabulary);
  assert.equal(concept.stage, "concept");
  assert.equal(concept.issues[0].label, "Id");

  const incompleteVocabulary = completeVocabulary.map((entry) => entry.id === "id" ? { ...entry, physicalName: "" } : entry);
  const logical = assessModelMaturity(model(), [domain], incompleteVocabulary);
  assert.equal(logical.stage, "logical");
  assert.match(logical.issues[0].detail, /Vocabulary “Id” needs a physical name/);

  const matured = assessModelMaturity(model(), [domain], completeVocabulary);
  assert.deepEqual(matured, { stage: "matured", maturedLevel: 0.5, issues: [] });
});

test("logical diagnostics identify every affected name and missing vocabulary value", () => {
  const entries = completeVocabulary.map((entry) => ({ ...entry, systemName: entry.id === "order" || entry.id === "identifier" ? "" : entry.systemName, physicalName: entry.id === "id" ? "" : entry.physicalName }));
  const assessment = assessModelMaturity(model(), [domain], entries);
  assert.equal(assessment.stage, "logical");
  assert.deepEqual(assessment.issues.map((issue) => issue.label), ["Order", "Id", "Identifier"]);
  assert.ok(assessment.issues.every((issue) => issue.actionKey));
});

test("accepted vocabulary changes automatically persist the derived maturity", () => {
  const actor = { id: "owner", name: "Owner", color: "#000", x: 0, y: 0, online: true, canvasId: "main" };
  const state = {
    canvases: [{ id: "main", name: "Main" }], placements: [{ canvasId: "main", seedId: "order-model", x: 0, y: 0, accessMode: "owner" }], seeds: [model({ maturedLevel: 0.5 })],
    relationships: [], relationshipReferences: [], domains: [domain], domainCategories: [], namingPolicy: {}, vocabularyEntries: completeVocabulary,
    dfd: { canvases: [], nodes: [], flows: [], groups: [], crudMatrix: { orientation: "processes_rows", processOrder: [], modelOrder: ["order-model"] } },
    users: [actor], locks: {}, annotations: []
  };
  const changedEntry = { ...completeVocabulary.find((entry) => entry.id === "id"), physicalName: "" };
  const next = applyDurableOperation(state, { type: "vocabulary", entry: changedEntry, create: false, delete: false }, actor.id);
  assert.equal(next.seeds[0].maturedLevel, 1.25);
});

test("saving a model description persists the text and automatic maturity together", () => {
  const actor = { id: "owner", name: "Owner", color: "#000", x: 0, y: 0, online: true, canvasId: "main" };
  const initialModel = model({ description: defaultModelDescription, maturedLevel: 6 });
  const state = {
    canvases: [{ id: "main", name: "Main" }], placements: [{ canvasId: "main", seedId: initialModel.id, x: 0, y: 0, accessMode: "owner" }], seeds: [initialModel],
    relationships: [], relationshipReferences: [], domains: [domain], domainCategories: [], namingPolicy: {}, vocabularyEntries: completeVocabulary,
    dfd: { canvases: [], nodes: [], flows: [], groups: [], crudMatrix: { orientation: "processes_rows", processOrder: [], modelOrder: [initialModel.id] } },
    users: [actor], locks: { [initialModel.id]: actor }, annotations: []
  };
  const description = "Tracks confirmed customer orders.";
  const next = applyDurableOperation(state, { type: "seed", seed: { ...initialModel, description }, create: false, canvasId: "main" }, actor.id);
  assert.equal(next.seeds[0].description, description);
  assert.equal(next.seeds[0].maturedLevel, 0.5);
});
