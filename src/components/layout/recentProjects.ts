import type { OpfsProject } from "../../persistence/projectCatalog";

export const RECENT_PROJECT_LIMIT = 4;

export function getRecentProjects(projects: readonly OpfsProject[]) {
  return [...projects]
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, RECENT_PROJECT_LIMIT);
}
