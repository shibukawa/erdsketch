import assert from "node:assert/strict";
import test from "node:test";
import { evaluateBulkEntryNames, parseBulkEntryText } from "../src/features/modeling/bulkEntry.ts";

test("parseBulkEntryText extracts the first TSV column and skips blank rows", () => {
  const parsed = parseBulkEntryText("Customer\tignored\n\n Order \tmeta\r\n\tignored\nInvoice");
  assert.deepEqual(parsed, {
    names: ["Customer", "Order", "Invoice"],
    skippedEmptyCount: 2,
    hadMultipleRows: true,
    hadAdditionalColumns: true
  });
});

test("evaluateBulkEntryNames marks existing and duplicate candidates", () => {
  const evaluations = evaluateBulkEntryNames(["Customer", " order ", "Order", "", "Invoice"], ["customer", "product"]);
  assert.deepEqual(evaluations, [
    { normalizedName: "Customer", status: "existing", reason: "Already exists." },
    { normalizedName: "order", status: "ready" },
    { normalizedName: "Order", status: "duplicate", reason: "Duplicate within this paste." },
    { normalizedName: "", status: "empty", reason: "Empty rows are skipped." },
    { normalizedName: "Invoice", status: "ready" }
  ]);
});