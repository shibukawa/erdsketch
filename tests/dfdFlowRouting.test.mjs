import assert from "node:assert/strict";
import test from "node:test";

import { buildDfdFlowRoutes } from "../src/features/dfd/flowRouting.ts";

function node(id, kind, x, y) {
  return { id, definitionId: `${id}-definition`, canvasId: "canvas", kind, name: id, x, y };
}

function flow(id, sourceId, destinationId) {
  return { id, canvasId: "canvas", sourceId, destinationId };
}

test("source ports follow opposite endpoint Y order instead of flow array order", () => {
  const nodes = [
    node("publisher", "process", 0, 160),
    node("upper", "model", 500, 20),
    node("lower", "model", 500, 340)
  ];
  const flows = [
    flow("a-lower", "publisher", "lower"),
    flow("z-upper", "publisher", "upper")
  ];

  const routes = buildDfdFlowRoutes(flows, nodes, []);

  assert.ok(routes.get("z-upper").startY < routes.get("a-lower").startY);
});

test("destination ports follow opposite endpoint Y order", () => {
  const nodes = [
    node("upper", "process", 0, 20),
    node("lower", "process", 0, 340),
    node("store", "model", 500, 160)
  ];
  const flows = [
    flow("a-lower", "lower", "store"),
    flow("z-upper", "upper", "store")
  ];

  const routes = buildDfdFlowRoutes(flows, nodes, []);

  assert.ok(routes.get("z-upper").endY < routes.get("a-lower").endY);
});

test("upward and downward routes use different vertical X lanes", () => {
  const nodes = [
    node("up-source", "process", 0, 320),
    node("up-destination", "model", 500, 0),
    node("down-source", "process", 0, 0),
    node("down-destination", "model", 500, 320)
  ];
  const flows = [
    flow("up", "up-source", "up-destination"),
    flow("down", "down-source", "down-destination")
  ];

  const routes = buildDfdFlowRoutes(flows, nodes, []);
  const upX = routes.get("up").verticalSegments[0].x;
  const downX = routes.get("down").verticalSegments[0].x;

  assert.ok(upX < downX);
  assert.ok(Math.abs(upX - downX) >= 13);
});

test("overlapping same-direction vertical segments receive distinct lanes", () => {
  const nodes = [
    node("source-one", "process", 0, 320),
    node("destination-one", "model", 500, 0),
    node("source-two", "process", 0, 350),
    node("destination-two", "model", 500, 30)
  ];
  const flows = [
    flow("one", "source-one", "destination-one"),
    flow("two", "source-two", "destination-two")
  ];

  const routes = buildDfdFlowRoutes(flows, nodes, []);
  const firstX = routes.get("one").verticalSegments[0].x;
  const secondX = routes.get("two").verticalSegments[0].x;

  assert.ok(Math.abs(firstX - secondX) >= 13);
});

test("routing is deterministic when flow input order changes", () => {
  const nodes = [
    node("source", "process", 0, 160),
    node("upper", "model", 500, 0),
    node("middle", "model", 500, 160),
    node("lower", "model", 500, 320)
  ];
  const flows = [
    flow("lower-flow", "source", "lower"),
    flow("upper-flow", "source", "upper"),
    flow("middle-flow", "source", "middle")
  ];

  const forward = buildDfdFlowRoutes(flows, nodes, []);
  const reversed = buildDfdFlowRoutes([...flows].reverse(), nodes, []);

  for (const item of flows) assert.deepEqual(forward.get(item.id), reversed.get(item.id));
});

test("route endpoints follow a node while it moves", () => {
  const nodes = [
    node("source", "process", 0, 100),
    node("destination", "model", 500, 100)
  ];
  const flows = [flow("moving", "source", "destination")];
  const before = buildDfdFlowRoutes(flows, nodes, []).get("moving");
  const movedNodes = nodes.map((item) => item.id === "source" ? { ...item, x: item.x + 80, y: item.y + 120 } : item);
  const duringDrag = buildDfdFlowRoutes(flows, movedNodes, []).get("moving");

  assert.equal(duringDrag.startX, before.startX + 80);
  assert.equal(duringDrag.startY, before.startY + 120);
  assert.equal(duringDrag.endX, before.endX);
  assert.equal(duringDrag.endY, before.endY);
  assert.notEqual(duringDrag.path, before.path);
});
