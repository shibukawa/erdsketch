import assert from "node:assert/strict";
import test from "node:test";
import { annotationStrokes, screenToleranceToWorld, simplifyPointSequence } from "../src/features/annotations/geometry.ts";

test("simplifyPointSequence removes near and collinear samples while retaining endpoints", () => {
  const points = [
    { x: 0, y: 0 },
    { x: 0.2, y: 0.1 },
    { x: 1, y: 0 },
    { x: 2, y: 0 },
    { x: 3, y: 2 }
  ];
  assert.deepEqual(simplifyPointSequence(points, 0.5), [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 2 }]);
});

test("simplifyPointSequence keeps enough boundary vertices", () => {
  const points = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];
  assert.ok(simplifyPointSequence(points, 100, 3).length >= 3);
});

test("annotationStrokes reads new groups and legacy single-stroke points", () => {
  const base = { id: "a", canvasType: "erd", canvasId: "c", kind: "freehand_stroke", color: "#000", strokeWidth: 2, layer: "annotation" };
  const legacy = [{ x: 1, y: 2 }, { x: 3, y: 4 }];
  const grouped = [[{ x: 5, y: 6 }, { x: 7, y: 8 }], [{ x: 9, y: 10 }, { x: 11, y: 12 }]];
  assert.deepEqual(annotationStrokes({ ...base, points: legacy }), [legacy]);
  assert.deepEqual(annotationStrokes({ ...base, points: legacy, strokes: grouped.map((points) => ({ points })) }), grouped);
});

test("screenToleranceToWorld follows canvas zoom", () => {
  assert.equal(screenToleranceToWorld((x, y) => ({ x: x / 2 + 10, y: y / 2 + 20 }), 4), 2);
});
