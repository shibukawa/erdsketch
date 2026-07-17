import assert from "node:assert/strict";
import test from "node:test";
import { unzipSync } from "fflate";
import { MonotonicTimer, ensureStateTimestamps, timestampDurableOperation } from "../src/collaboration/timestamp.ts";
import { createProjectDocumentSet, decodeProjectArchive, encodeProjectArchive, readProjectDocumentSet } from "../src/persistence/projectDocument.ts";
import { createStarterProjectState } from "../src/features/modeling/starterProjects.ts";

function projectState() {
  return {
    canvases: [{ id: "canvas-id", name: "Main" }],
    placements: [{ canvasId: "canvas-id", seedId: "model-id", x: 10, y: 20, accessMode: "owner" }],
    seeds: [{ id: "model-id", title: "Order", description: "Line one\n-- arbitrary user content --", fields: [{ id: "field-id", name: "id", primaryKey: true, important: true }], x: 10, y: 20, role: "transaction", dependency: "independent", hasPrivacy: false, maturedLevel: 1, rotation: 0 }],
    relationships: [],
    relationshipReferences: [],
    domains: [],
    domainCategories: [],
    namingPolicy: { tablePluralization: "singular", tableJoinMode: "separator", tableSeparator: "_", fieldJoinMode: "separator", fieldSeparator: "_", domainJoinMode: "concatenate", domainSeparator: "_" },
    vocabularyEntries: [],
    dfd: { canvases: [{ id: "dfd-id", name: "Flow" }], nodes: [], flows: [], groups: [], crudMatrix: { orientation: "processes_rows", processOrder: [], modelOrder: [] } },
    annotations: [{
      id: "pen-id", canvasType: "erd", canvasId: "canvas-id", kind: "freehand_stroke",
      strokes: [
        { points: [{ x: 10, y: 20 }, { x: 30, y: 40 }] },
        { points: [{ x: 50, y: 60 }, { x: 70, y: 80 }] }
      ],
      color: "#334155", fill: "transparent", strokeWidth: 3, layer: "annotation", createdBy: "client", updatedBy: "client"
    }]
  };
}

test("host timer emits fixed-width increasing base36 IDs within one millisecond", () => {
  const originalNow = Date.now;
  Date.now = () => 1_800_000_000_000;
  try {
    const timer = new MonotonicTimer();
    const first = timer.newId();
    const second = timer.newId();
    assert.equal(first.length, 9);
    assert.equal(parseInt(second, 36), parseInt(first, 36) + 1);
  } finally {
    Date.now = originalNow;
  }
});

test("host replaces a participant timestamp when accepting a created element", () => {
  const durable = ensureStateTimestamps(projectState(), new MonotonicTimer());
  const collaboration = { ...durable, users: [], locks: {} };
  const accepted = timestampDurableOperation(collaboration, {
    type: "domain_category",
    create: true,
    category: { id: "category-id", name: "Business", timestamp: "participant-value" }
  }, new MonotonicTimer());
  assert.equal(accepted.type, "domain_category");
  assert.match(accepted.category.timestamp, /^[0-9a-z]{9}$/);
  assert.notEqual(accepted.category.timestamp, "participant-value");
});

test("split YAML documents and ZIP round-trip the durable project", async () => {
  const state = ensureStateTimestamps(projectState(), new MonotonicTimer());
  const documents = createProjectDocumentSet("project-id", state);
  assert.equal(documents.formatVersion, 2);
  assert.ok(documents.documents["project.yaml"]);
  assert.ok(Object.keys(documents.documents).some((path) => /^model\/model-[0-9a-z]{9}\/model\.yaml$/.test(path)));
  assert.ok(Object.keys(documents.documents).some((path) => /^model\/model-[0-9a-z]{9}\/field-[0-9a-z]{9}\.yaml$/.test(path)));
  assert.deepEqual(readProjectDocumentSet(documents), state);

  const first = await encodeProjectArchive("project-id", state);
  const second = await encodeProjectArchive("project-id", state);
  assert.deepEqual(first, second);
  assert.deepEqual(Object.keys(unzipSync(first)), Object.keys(documents.documents));
  assert.deepEqual(await decodeProjectArchive(new Blob([first])), state);
});

test("split YAML preserves a complete starter ERD and DFD graph", () => {
  const state = ensureStateTimestamps(createStarterProjectState("blog"), new MonotonicTimer());
  const restored = readProjectDocumentSet(createProjectDocumentSet("blog-project", state));
  assert.deepEqual(restored, JSON.parse(JSON.stringify(state)));
});
