import assert from "node:assert/strict";
import test from "node:test";

import { calculateCrudHeatmap, crudHeatmapColor } from "../src/features/dfd/crudHeatmap.ts";

const domains = [
  { id: "integer", name: "Integer", categoryId: "built-in", shape: "primitive", primitiveType: "integer", bits: 32, components: [] }
];

function model(id, initialRecordCount, domainId = "integer") {
  return {
    id,
    title: id,
    description: "",
    fields: [{ id: `${id}-field`, name: "id", primaryKey: false, important: false, domainId }],
    x: 0,
    y: 0,
    role: "master",
    dependency: "independent",
    hasPrivacy: false,
    maturedLevel: 1,
    rotation: 0,
    volumeEstimate: { initialRecordCount, growthRate: { amount: 0, period: "day" } }
  };
}

test("model heatmap min-max normalizes log scores to 0, 50, and 100 percent", () => {
  const heatmap = calculateCrudHeatmap(
    [model("small", 9), model("medium", 99), model("large", 999)],
    domains,
    [],
    new Map(),
    "record_count"
  );

  assert.equal(heatmap.models.get("small").score, 1);
  assert.equal(heatmap.models.get("small").percentage, 0);
  assert.equal(heatmap.models.get("medium").score, 2);
  assert.equal(heatmap.models.get("medium").percentage, 50);
  assert.equal(heatmap.models.get("large").score, 3);
  assert.equal(heatmap.models.get("large").percentage, 100);
  assert.equal(crudHeatmapColor(heatmap.models.get("small").weight, 0), "#ffffff");
});

test("process heatmap min-max normalizes independently after multiplying read-model values", () => {
  const heatmap = calculateCrudHeatmap(
    [model("small", 9), model("medium", 99), model("large", 999)],
    domains,
    ["reads-small", "reads-medium", "reads-large"],
    new Map([
      ["reads-small", new Set(["small"])],
      ["reads-medium", new Set(["medium"])],
      ["reads-large", new Set(["large"])]
    ]),
    "record_count"
  );

  assert.equal(heatmap.processes.get("reads-small").percentage, 0);
  assert.equal(heatmap.processes.get("reads-medium").percentage, 50);
  assert.equal(heatmap.processes.get("reads-large").percentage, 100);
});

test("process value is the product of distinct read-model values", () => {
  const heatmap = calculateCrudHeatmap(
    [model("small", 9), model("large", 99)],
    domains,
    ["reads-both"],
    new Map([["reads-both", new Set(["small", "large"])]]),
    "record_count"
  );

  assert.equal(heatmap.processes.get("reads-both").value, 891);
  assert.equal(heatmap.processes.get("reads-both").percentage, 0);
});

test("equal scores all normalize to zero percent", () => {
  const heatmap = calculateCrudHeatmap(
    [model("left", 99), model("right", 99)],
    domains,
    [],
    new Map(),
    "record_count"
  );

  assert.equal(heatmap.models.get("left").percentage, 0);
  assert.equal(heatmap.models.get("right").percentage, 0);
});

test("unknown field size makes storage metrics and dependent process metrics unavailable", () => {
  const heatmap = calculateCrudHeatmap(
    [model("known", 10), model("unknown", 10, "missing")],
    domains,
    ["reads-unknown"],
    new Map([["reads-unknown", new Set(["unknown"])]]),
    "storage_size"
  );

  assert.equal(heatmap.models.get("known").available, true);
  assert.equal(heatmap.models.get("unknown").available, false);
  assert.equal(heatmap.models.get("unknown").percentage, null);
  assert.equal(heatmap.processes.get("reads-unknown").available, false);
});

test("cell color combines model red and process blue weights", () => {
  assert.equal(crudHeatmapColor(0, 0), "#ffffff");
  assert.equal(crudHeatmapColor(1, 0), "#ff9999");
  assert.equal(crudHeatmapColor(0, 1), "#9999ff");
  assert.equal(crudHeatmapColor(1, 1), "#995c99");
});
