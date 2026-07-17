import assert from "node:assert/strict";
import test from "node:test";

import { columnDefaultKindsForPrimitiveType } from "../src/features/modeling/columnDefaults.ts";

test("numeric and text fields only offer none and literal defaults", () => {
  assert.deepEqual(columnDefaultKindsForPrimitiveType("integer"), ["none", "literal"]);
  assert.deepEqual(columnDefaultKindsForPrimitiveType("text"), ["none", "literal"]);
});

test("date fields offer CURRENT_DATE but not CURRENT_TIMESTAMP", () => {
  assert.deepEqual(columnDefaultKindsForPrimitiveType("date"), ["none", "literal", "current_date"]);
});

test("datetime fields offer CURRENT_TIMESTAMP but not CURRENT_DATE", () => {
  assert.deepEqual(columnDefaultKindsForPrimitiveType("datetime"), ["none", "literal", "current_timestamp"]);
  assert.deepEqual(columnDefaultKindsForPrimitiveType("datetime_with_timezone"), [
    "none",
    "literal",
    "current_timestamp",
  ]);
});

test("an unresolved domain falls back to safe defaults", () => {
  assert.deepEqual(columnDefaultKindsForPrimitiveType(), ["none", "literal"]);
});
