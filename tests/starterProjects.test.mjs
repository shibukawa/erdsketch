import assert from "node:assert/strict";
import test from "node:test";
import { createStarterProjectState, starterProjects } from "../src/features/modeling/starterProjects.ts";
import { estimateCapacity, projectionHorizonsForModel } from "../src/features/modeling/capacity.ts";
import { buildVocabularyMatchCache } from "../src/features/modeling/vocabulary.ts";

test("starter catalog contains empty and registered complete examples", () => {
  assert.equal(starterProjects[0]?.id, "empty");
  assert.equal(new Set(starterProjects.map((starter) => starter.id)).size, starterProjects.length);
  assert.ok(starterProjects.length > 1);
  for (const starter of starterProjects) {
    const state = createStarterProjectState(starter.id);
    assert.equal(starter.modelCount, state.seeds.length);
    assert.equal(starter.domainCount, state.domains.filter((domain) => !domain.system).length);
    assert.equal(starter.vocabularyCount, state.vocabularyEntries.length);
    assert.equal(starter.erdCanvasCount, 1);
    assert.equal(starter.dfdCanvasCount, 1);
  }
});

test("every non-empty starter has defined assigned domains and complete vocabulary bindings", () => {
  for (const starter of starterProjects.filter((candidate) => candidate.id !== "empty")) {
    const state = createStarterProjectState(starter.id);
    const domainIds = new Set(state.domains.map((domain) => domain.id));
    const customDomains = state.domains.filter((domain) => !domain.system);
    assert.equal(new Set(customDomains.map((domain) => domain.name)).size, customDomains.length);
    assert.ok(customDomains.every((domain) => domain.shape === "scalar" && domain.primitiveType));
    assert.ok(state.seeds.flatMap((model) => model.fields).every((field) => field.domainId && domainIds.has(field.domainId)));

    const cache = buildVocabularyMatchCache(state.seeds, state.domains, state.vocabularyEntries, state.namingPolicy);
    assert.ok(cache.matches.size > 0);
    assert.deepEqual([...cache.matches.values()].filter((match) => match.status !== "complete").map((match) => ({ key: match.key, status: match.status, unmatched: match.unmatched })), []);
  }
});

test("starters include valid ERD relationships and a populated DFD", () => {
  for (const starter of starterProjects.filter((candidate) => candidate.id !== "empty")) {
    const state = createStarterProjectState(starter.id);
    const modelIds = new Set(state.seeds.map((model) => model.id));
    const dfdNodeIds = new Set(state.dfd.nodes.map((node) => node.id));
    assert.ok(state.relationships.length > 0);
    assert.ok(state.relationships.every((relationship) => modelIds.has(relationship.sourceId) && modelIds.has(relationship.targetId)));
    assert.ok(state.dfd.nodes.some((node) => node.kind === "process"));
    assert.ok(state.dfd.nodes.some((node) => node.kind === "model"));
    assert.ok(state.dfd.flows.length > 0);
    assert.ok(state.dfd.flows.every((flow) => dfdNodeIds.has(flow.sourceId) && dfdNodeIds.has(flow.destinationId)));
  }
});

test("every starter model has complete nonzero volume and storage estimates", () => {
  for (const starter of starterProjects.filter((candidate) => candidate.id !== "empty")) {
    const state = createStarterProjectState(starter.id);
    for (const model of state.seeds) {
      assert.ok(model.volumeEstimate, `${starter.id}/${model.id} has no volume estimate`);
      assert.ok(model.volumeEstimate.initialRecordCount > 0, `${starter.id}/${model.id} has no initial records`);
      assert.ok(model.volumeEstimate.growthRate.amount > 0, `${starter.id}/${model.id} has no growth estimate`);
      if (model.role === "transaction") assert.ok(model.volumeEstimate.retentionPeriod?.value > 0, `${starter.id}/${model.id} has no retention estimate`);

      const horizons = projectionHorizonsForModel(model);
      const projection = estimateCapacity(model, state.domains, horizons.at(-1));
      assert.deepEqual(projection.missingFieldNames, [], `${starter.id}/${model.id} has incomplete field-size estimates`);
      assert.ok(projection.recordCount > 0, `${starter.id}/${model.id} has no projected records`);
      assert.ok(projection.totalBytes > 0, `${starter.id}/${model.id} has no projected storage`);
    }
    assert.ok(new Set(state.seeds.map((model) => model.volumeEstimate.initialRecordCount)).size > 1, `${starter.id} estimates do not create useful relative weights`);
  }
});

test("starter creation returns an independent project graph", () => {
  const starterId = starterProjects.find((starter) => starter.id !== "empty").id;
  const first = createStarterProjectState(starterId);
  const second = createStarterProjectState(starterId);
  first.seeds[0].title = "Changed";
  first.domains[0].name = "Changed";
  assert.notEqual(second.seeds[0].title, "Changed");
  assert.notEqual(second.domains[0].name, "Changed");
});

test("blog DFD uses the imported edit flow and keeps every arrow moving left to right", () => {
  const state = createStarterProjectState("blog");
  const nodes = new Map(state.dfd.nodes.map((node) => [node.id, node]));
  const editPost = nodes.get("edit-post");
  const editedPost = state.dfd.flows.find((flow) => flow.id === "edited-post");

  assert.equal(editPost?.name, "Edit post");
  assert.deepEqual(editedPost?.crudAssignments, [{ processUnitId: "blog-definition-edit-post", modelId: "post", operations: ["U", "D"] }]);
  assert.ok(state.dfd.flows.every((flow) => nodes.get(flow.sourceId).x < nodes.get(flow.destinationId).x));
});

test("todo DFD uses the imported daily screen flows and keeps every arrow moving left to right", () => {
  const state = createStarterProjectState("todo");
  const nodes = new Map(state.dfd.nodes.map((node) => [node.id, node]));
  const dailyScreen = nodes.get("daily-screen");
  const assignments = Object.fromEntries(state.dfd.flows.filter((flow) => flow.crudAssignments?.length).map((flow) => [flow.id, flow.crudAssignments]));

  assert.equal(dailyScreen?.name, "Daily screen");
  assert.deepEqual(assignments, {
    "todo-list-data": [{ processUnitId: "todo-definition-manage-lists", modelId: "todo-list", operations: ["C"] }],
    "todo-label-data": [{ processUnitId: "todo-definition-daily-screen", modelId: "label", operations: ["C"] }],
    "todo-daily-item-data": [{ processUnitId: "todo-definition-daily-screen", modelId: "todo-item", operations: ["U"] }],
    "todo-item-data": [{ processUnitId: "todo-definition-manage-items", modelId: "todo-item", operations: ["C"] }]
  });
  assert.ok(state.dfd.flows.every((flow) => nodes.get(flow.sourceId).x < nodes.get(flow.destinationId).x));
});

test("help desk DFD uses the imported resolution update and keeps every arrow moving left to right", () => {
  const state = createStarterProjectState("help-desk");
  const nodes = new Map(state.dfd.nodes.map((node) => [node.id, node]));
  const resolvedTicket = state.dfd.flows.find((flow) => flow.id === "resolved-ticket");

  assert.equal(state.dfd.nodes.length, 10);
  assert.equal(state.dfd.flows.length, 9);
  assert.deepEqual(resolvedTicket?.crudAssignments, [{ processUnitId: "help-desk-definition-resolve-ticket", modelId: "ticket", operations: ["U"] }]);
  assert.ok(state.dfd.flows.every((flow) => nodes.get(flow.sourceId).x < nodes.get(flow.destinationId).x));
});
