import assert from "node:assert/strict";
import test from "node:test";
import { getDomainPhysicalTypeLabel } from "../src/features/modeling/utils.ts";

const domains = [
  { id: "identifier", name: "Identifier", categoryId: "user", shape: "scalar", components: [{ id: "identifier-value", name: "value", domainId: "uuid", required: true }] },
  { id: "uuid", name: "UUID", categoryId: "primitive", shape: "primitive", primitiveType: "uuid", components: [] },
  { id: "status", name: "Status", categoryId: "user", shape: "primitive", primitiveType: "code_set", codeSetBaseType: "varchar", length: 24, components: [] },
  { id: "amount", name: "Amount", categoryId: "primitive", shape: "primitive", primitiveType: "decimal", precision: 18, scale: 2, components: [] },
  { id: "summary", name: "Summary", categoryId: "user", shape: "composite", components: [{ id: "summary-id", name: "id", domainId: "identifier", required: true }, { id: "summary-amount", name: "amount", domainId: "amount", required: true }] },
  { id: "unresolved", name: "Unresolved", categoryId: "user", shape: "unresolved", components: [] }
];

test("physical domain labels follow scalar, code-set, and composite definitions", () => {
  assert.equal(getDomainPhysicalTypeLabel("identifier", domains), "UUID");
  assert.equal(getDomainPhysicalTypeLabel("status", domains), "VARCHAR(24)");
  assert.equal(getDomainPhysicalTypeLabel("summary", domains), "UUID + DECIMAL(18, 2)");
});

test("physical domain labels report missing or unresolved definitions", () => {
  assert.equal(getDomainPhysicalTypeLabel(undefined, domains), undefined);
  assert.equal(getDomainPhysicalTypeLabel("missing", domains), undefined);
  assert.equal(getDomainPhysicalTypeLabel("unresolved", domains), undefined);
});
