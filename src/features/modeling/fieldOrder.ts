import type { ModelField } from "./types";

export function reorderFields(fields: ModelField[], sourceId: string, targetId: string, insertAfter: boolean) {
  if (sourceId === targetId) return fields;
  const source = fields.find((field) => field.id === sourceId);
  if (!source) return fields;
  const remaining = fields.filter((field) => field.id !== sourceId);
  const targetIndex = remaining.findIndex((field) => field.id === targetId);
  if (targetIndex < 0) return fields;
  const insertionIndex = targetIndex + (insertAfter ? 1 : 0);
  return [...remaining.slice(0, insertionIndex), source, ...remaining.slice(insertionIndex)];
}
