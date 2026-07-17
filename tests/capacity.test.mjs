import assert from "node:assert/strict";
import test from "node:test";

import { estimateCapacity } from "../src/features/modeling/capacity.ts";

const horizon = { label: "Now", value: 0, unit: "day" };
const domains = [
  { id: "integer", name: "Integer", categoryId: "built-in", shape: "primitive", primitiveType: "integer", bits: 32, components: [] },
  { id: "text", name: "Text", categoryId: "built-in", shape: "primitive", primitiveType: "text", components: [] },
  { id: "unresolved", name: "Unresolved", categoryId: "user", shape: "unresolved", components: [] },
];

function field(id, domainId, estimatedAverageSizeBytes) {
  return { id, name: id, primaryKey: false, important: false, domainId, estimatedAverageSizeBytes };
}

function model(fields) {
  return {
    id: "model",
    title: "Model",
    description: "",
    fields,
    x: 0,
    y: 0,
    role: "transaction",
    dependency: "independent",
    hasPrivacy: false,
    maturedLevel: 1,
    rotation: 0,
  };
}

test("capacity issues distinguish missing domains, incomplete definitions, and variable sizes", () => {
  const projection = estimateCapacity(model([
    field("order_number"),
    field("dangling_domain", "missing"),
    field("unresolved_domain", "unresolved"),
    field("notes", "text"),
    field("id", "integer"),
  ]), domains, horizon);

  assert.deepEqual(projection.missingDomainFieldNames, ["order_number"]);
  assert.deepEqual(projection.incompleteDomainFieldNames, ["dangling_domain", "unresolved_domain"]);
  assert.deepEqual(projection.missingAverageSizeFieldNames, ["notes"]);
  assert.deepEqual(projection.missingFieldNames, ["order_number", "dangling_domain", "unresolved_domain", "notes"]);
});

test("an explicit average size resolves a variable-size field warning", () => {
  const projection = estimateCapacity(model([field("notes", "text", 120)]), domains, horizon);
  assert.deepEqual(projection.missingFieldNames, []);
  assert.equal(projection.recordPayloadBytes, 120);
});
