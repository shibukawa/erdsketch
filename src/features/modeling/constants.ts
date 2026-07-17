import type { DataDomain, Dependency, DomainCategory, EntityRole, ModelSeed, Relationship, RelationshipReference } from "./types";

export const roleOptions: EntityRole[] = ["master", "transaction", "summary", "history", "work"];
export const dependencyOptions: Dependency[] = ["independent", "dependent"];
export const dependencyLabels: Record<Dependency, string> = {
  independent: "Parent table",
  dependent: "Dependent table"
};

export const roleMeta: Record<EntityRole, { label: string; fill: string; stroke: string; chip: string }> = {
  master: {
    label: "master",
    fill: "rgba(236,253,245,0.96)",
    stroke: "#059669",
    chip: "border-emerald-200 bg-emerald-50 text-emerald-800"
  },
  transaction: {
    label: "transaction",
    fill: "rgba(239,246,255,0.96)",
    stroke: "#2563eb",
    chip: "border-blue-200 bg-blue-50 text-blue-800"
  },
  summary: {
    label: "summary",
    fill: "rgba(254,252,232,0.96)",
    stroke: "#ca8a04",
    chip: "border-yellow-200 bg-yellow-50 text-yellow-800"
  },
  history: {
    label: "history",
    fill: "rgba(245,243,255,0.96)",
    stroke: "#7c3aed",
    chip: "border-violet-200 bg-violet-50 text-violet-800"
  },
  work: {
    label: "work",
    fill: "rgba(248,250,252,0.96)",
    stroke: "#64748b",
    chip: "border-slate-200 bg-slate-50 text-slate-700"
  }
};

export const maturedLevelSteps = [0.5, 1.25, 3.5, 6];
export const maturedStepLabels = new Map([
  [6, "seed"],
  [3.5, "concept"],
  [1.25, "logical"],
  [0.5, "matured"]
]);
export const cardWidth = 300;
export const cardHeight = 194;

export const initialDomainCategories: DomainCategory[] = [
  { id: "primitive", name: "Primitive", system: true },
  { id: "user-defined", name: "User Defined" }
];

export const initialDomains: DataDomain[] = [
  { id: "primitive-integer", name: "Integer", categoryId: "primitive", shape: "primitive", primitiveType: "integer", bits: 32, components: [], system: true },
  { id: "primitive-decimal", name: "Decimal", categoryId: "primitive", shape: "primitive", primitiveType: "decimal", precision: 18, scale: 2, components: [], system: true },
  { id: "primitive-floating-point", name: "Floating point", categoryId: "primitive", shape: "primitive", primitiveType: "floating_point", bits: 64, components: [], system: true },
  { id: "primitive-varchar", name: "Varchar", categoryId: "primitive", shape: "primitive", primitiveType: "varchar", length: 255, components: [], system: true },
  { id: "primitive-text", name: "Text", categoryId: "primitive", shape: "primitive", primitiveType: "text", components: [], system: true },
  { id: "primitive-blob", name: "Blob", categoryId: "primitive", shape: "primitive", primitiveType: "blob", components: [], system: true },
  { id: "primitive-date", name: "Date", categoryId: "primitive", shape: "primitive", primitiveType: "date", components: [], system: true },
  { id: "primitive-time", name: "Time", categoryId: "primitive", shape: "primitive", primitiveType: "time", components: [], system: true },
  { id: "primitive-datetime", name: "Datetime", categoryId: "primitive", shape: "primitive", primitiveType: "datetime", components: [], system: true },
  { id: "primitive-datetime-with-timezone", name: "Datetime with timezone", categoryId: "primitive", shape: "primitive", primitiveType: "datetime_with_timezone", components: [], system: true },
  { id: "primitive-boolean", name: "Boolean", categoryId: "primitive", shape: "primitive", primitiveType: "boolean", components: [], system: true },
  { id: "primitive-uuid", name: "UUID", categoryId: "primitive", shape: "primitive", primitiveType: "uuid", components: [], system: true }
];

export const initialSeeds: ModelSeed[] = [
  {
    id: "order",
    title: "Order",
    description: "Transaction root. Grow lifecycle, state, and line items from here.",
    fields: [
      { id: "order-id", name: "id", primaryKey: true, important: false, domainId: "primitive-integer", required: true },
      { id: "order-number", name: "order_number", primaryKey: false, important: true },
      { id: "ordered-at", name: "ordered_at", primaryKey: false, important: true }
    ],
    x: 80,
    y: 40,
    role: "transaction",
    dependency: "independent",
    hasPrivacy: false,
    maturedLevel: 1.25,
    rotation: -0.5
  },
  {
    id: "customer",
    title: "Customer",
    description: "Master candidate. Ownership and distribution pattern are still open.",
    fields: [
      { id: "customer-id", name: "id", primaryKey: true, important: false, domainId: "primitive-integer", required: true },
      { id: "customer-name", name: "name", primaryKey: false, important: true }
    ],
    x: 430,
    y: 70,
    role: "master",
    dependency: "independent",
    hasPrivacy: true,
    maturedLevel: 0.5,
    rotation: 0.4
  },
  {
    id: "product",
    title: "Product",
    description: "Reference data. Could be snapshot at order time.",
    fields: [
      { id: "product-id", name: "id", primaryKey: true, important: false, domainId: "primitive-integer", required: true },
      { id: "product-name", name: "name", primaryKey: false, important: true }
    ],
    x: 760,
    y: 120,
    role: "master",
    dependency: "independent",
    hasPrivacy: false,
    maturedLevel: 3.5,
    rotation: -0.8
  },
  {
    id: "order-item",
    title: "Order Item",
    description: "Likely dependent entity extracted from repeated product fields.",
    fields: [{ id: "order-item-id", name: "id", primaryKey: true, important: false, domainId: "primitive-integer", required: true }],
    x: 230,
    y: 320,
    role: "transaction",
    dependency: "dependent",
    hasPrivacy: false,
    maturedLevel: 6,
    rotation: 0.7
  },
  {
    id: "shipping-address",
    title: "Shipping Address",
    description: "May grow as Value Object or transaction snapshot.",
    fields: [{ id: "postal-code", name: "postal_code", primaryKey: false, important: true }],
    x: 610,
    y: 390,
    role: "transaction",
    dependency: "dependent",
    hasPrivacy: true,
    maturedLevel: 6,
    rotation: -0.3
  }
];

export const initialRelationships: Relationship[] = [
  {
    id: "customer-orders",
    name: "places",
    sourceId: "customer",
    targetId: "order",
    sourceMultiplicity: "1",
    targetMultiplicity: "0..*",
    direction: "source-to-target",
    kind: "foreign-key"
  },
  {
    id: "order-items",
    name: "contains",
    sourceId: "order",
    targetId: "order-item",
    sourceMultiplicity: "1",
    targetMultiplicity: "1..*",
    direction: "source-to-target",
    kind: "foreign-key"
  },
  {
    id: "order-products",
    name: "uses",
    sourceId: "order",
    targetId: "product",
    sourceMultiplicity: "0..*",
    targetMultiplicity: "0..*",
    direction: "source-to-target",
    kind: "foreign-key"
  }
];

export const initialRelationshipReferences: RelationshipReference[] = initialRelationships.map((relationship) => ({
  id: `${relationship.id}-reference`,
  relationshipId: relationship.id,
  primaryKey: false,
  foreignKey: true,
  hiddenOnModelIds: []
}));
