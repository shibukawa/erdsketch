import { blogSpec } from "./blog.ts";
import { helpDeskSpec } from "./helpDesk.ts";
import { todoSpec } from "./todo.ts";

// Add or remove a starter by changing this single registry.
export const projectSpecs = [todoSpec, blogSpec, helpDeskSpec] as const;

export type RegisteredStarterProjectId = (typeof projectSpecs)[number]["id"];
