import type { ColumnDefault, PrimitiveType } from "./types";

export type ColumnDefaultKind = "none" | ColumnDefault["kind"];

export function columnDefaultKindsForPrimitiveType(primitiveType?: PrimitiveType): ColumnDefaultKind[] {
  const kinds: ColumnDefaultKind[] = ["none", "literal"];
  if (primitiveType === "date") kinds.push("current_date");
  if (primitiveType === "datetime" || primitiveType === "datetime_with_timezone") kinds.push("current_timestamp");
  return kinds;
}
