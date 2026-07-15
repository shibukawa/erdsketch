import type { DataDomain, IndexKey, ModelField, PartitionBound, RangePartitionScheme, Relationship, RelationshipReference } from "./types";
import { expandDomainField, getFieldEffectiveName } from "./utils";

export type PhysicalColumnCandidate = {
  id: string;
  source: IndexKey["source"];
  sourceId: string;
  componentId?: string;
  label: string;
  partitionHint: boolean;
};

export function physicalColumnCandidates(
  fields: ModelField[],
  domains: DataDomain[],
  relationshipReferences: Array<{ relationship: Relationship; reference: RelationshipReference }> = []
): PhysicalColumnCandidate[] {
  const fieldColumns = fields.flatMap((field) => expandDomainField(field, domains).map((expanded) => ({
    id: `field:${field.id}:${expanded.componentId ?? "scalar"}`,
    source: "field" as const,
    sourceId: field.id,
    componentId: expanded.componentId,
    label: expanded.componentId ? expanded.name : getFieldEffectiveName(field, domains),
    partitionHint: expanded.partitionKey
  })));
  const references = relationshipReferences.map(({ relationship, reference }) => ({
    id: `relationship:${reference.id}:`,
    source: "relationship" as const,
    sourceId: reference.id,
    label: relationship.name,
    partitionHint: false
  }));
  return [...fieldColumns, ...references];
}

export function indexKeyCandidateID(key: IndexKey) {
  return `${key.source}:${key.sourceId}:${key.componentId ?? (key.source === "field" ? "scalar" : "")}`;
}

export function defaultRangePartition(candidates: PhysicalColumnCandidate[]): RangePartitionScheme {
  return {
    strategy: "range",
    keys: candidates.filter((candidate) => candidate.source === "field" && candidate.partitionHint).map((candidate) => ({ fieldId: candidate.sourceId, componentId: candidate.componentId })),
    ranges: []
  };
}

function compareBound(left: PartitionBound, right: PartitionBound) {
  if (left.kind === right.kind && left.kind !== "literal") return 0;
  if (left.kind === "minvalue" || right.kind === "maxvalue") return -1;
  if (left.kind === "maxvalue" || right.kind === "minvalue") return 1;
  if (left.kind !== "literal" || right.kind !== "literal") return 0;
  const leftNumber = Number(left.value);
  const rightNumber = Number(right.value);
  if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) return leftNumber - rightNumber;
  return left.value.localeCompare(right.value);
}

function compareBounds(left: PartitionBound[], right: PartitionBound[]) {
  for (let index = 0; index < Math.min(left.length, right.length); index += 1) {
    const compared = compareBound(left[index], right[index]);
    if (compared !== 0) return compared;
  }
  return left.length - right.length;
}

export function validateRangePartition(scheme: RangePartitionScheme) {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (scheme.keys.length === 0) errors.push("Select at least one partition key.");
  const names = new Set<string>();
  for (const range of scheme.ranges) {
    const normalizedName = range.name.trim().toLowerCase();
    if (!normalizedName) errors.push("Every range needs a name.");
    else if (names.has(normalizedName)) errors.push(`Duplicate partition name: ${range.name}.`);
    names.add(normalizedName);
    if (range.from.length !== scheme.keys.length || range.to.length !== scheme.keys.length) errors.push(`${range.name || "Range"} has the wrong number of boundary values.`);
    else {
      const emptyBoundary = [...range.from, ...range.to].some((bound) => bound.kind === "literal" && !bound.value.trim());
      if (emptyBoundary) errors.push(`${range.name || "Range"} has an empty boundary value.`);
      else if (compareBounds(range.from, range.to) >= 0) errors.push(`${range.name || "Range"} must end after it starts.`);
    }
  }
  const sorted = [...scheme.ranges].filter((range) => range.from.length === scheme.keys.length && range.to.length === scheme.keys.length).sort((left, right) => compareBounds(left.from, right.from));
  for (let index = 1; index < sorted.length; index += 1) {
    const compared = compareBounds(sorted[index - 1].to, sorted[index].from);
    if (compared > 0) errors.push(`${sorted[index - 1].name} overlaps ${sorted[index].name}.`);
    else if (compared < 0) warnings.push(`There is a gap between ${sorted[index - 1].name} and ${sorted[index].name}.`);
  }
  return { errors, warnings };
}

export function parsePartitionBound(value: string): PartitionBound {
  const normalized = value.trim().toUpperCase();
  if (normalized === "MINVALUE") return { kind: "minvalue" };
  if (normalized === "MAXVALUE") return { kind: "maxvalue" };
  return { kind: "literal", value: value.trim() };
}

export function formatPartitionBound(bound: PartitionBound) {
  return bound.kind === "literal" ? bound.value : bound.kind.toUpperCase();
}
