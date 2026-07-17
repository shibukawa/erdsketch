import assert from "node:assert/strict";
import test from "node:test";
import { getRecentProjects, RECENT_PROJECT_LIMIT } from "../src/components/layout/recentProjects.ts";

function project(index, updatedAt) {
  return {
    projectId: `project-${index}`,
    displayName: `Project ${index}`,
    kind: "named",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt
  };
}

test("recent projects returns at most four projects in descending update order", () => {
  const projects = [
    project(1, "2026-07-01T00:00:00.000Z"),
    project(2, "2026-07-05T00:00:00.000Z"),
    project(3, "2026-07-03T00:00:00.000Z"),
    project(4, "2026-07-06T00:00:00.000Z"),
    project(5, "2026-07-04T00:00:00.000Z")
  ];

  assert.equal(RECENT_PROJECT_LIMIT, 4);
  assert.deepEqual(getRecentProjects(projects).map((item) => item.projectId), ["project-4", "project-2", "project-5", "project-3"]);
  assert.deepEqual(projects.map((item) => item.projectId), ["project-1", "project-2", "project-3", "project-4", "project-5"]);
});
