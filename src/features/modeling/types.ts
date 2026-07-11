export type EntityRole = "master" | "transaction" | "summary" | "history" | "work";

export type Dependency = "independent" | "dependent";

export type ModelField = {
  id: string;
  name: string;
  primaryKey: boolean;
  important: boolean;
  domainId?: string;
  useDomainName?: boolean;
};

export type PrimitiveType =
  | "integer"
  | "decimal"
  | "floating_point"
  | "varchar"
  | "text"
  | "blob"
  | "date"
  | "time"
  | "datetime"
  | "datetime_with_timezone"
  | "boolean"
  | "uuid";

export type DomainShape = "primitive" | "unresolved" | "scalar" | "composite";

export type DomainComponent = {
  id: string;
  name: string;
  domainId?: string;
  required: boolean;
  description?: string;
  partitionKey?: boolean;
};

export type DomainCategory = {
  id: string;
  name: string;
  system?: boolean;
};

export type DataDomain = {
  id: string;
  name: string;
  categoryId: string;
  shape: DomainShape;
  primitiveType?: PrimitiveType;
  bits?: 8 | 16 | 32 | 64;
  unsigned?: boolean;
  length?: number;
  precision?: number;
  scale?: number;
  components: DomainComponent[];
  partitionKey?: boolean;
  system?: boolean;
};

export type DomainCategoryBundle = {
  version: 1;
  category: Pick<DomainCategory, "name">;
  domains: DataDomain[];
};

export type ExpandedDomainField = {
  name: string;
  domainId: string;
  componentId?: string;
  partitionKey: boolean;
};

export type Multiplicity = "0..1" | "1" | "0..*" | "1..*";

export type RelationshipDirection = "source-to-target" | "target-to-source";

export type Relationship = {
  id: string;
  name: string;
  sourceId: string;
  targetId: string;
  sourceMultiplicity: Multiplicity;
  targetMultiplicity: Multiplicity;
  direction: RelationshipDirection;
};

export type RelationshipReference = {
  id: string;
  relationshipId: string;
  primaryKey: boolean;
  foreignKey: boolean;
};

export type CardDisplayMode = "description" | "key-fields";

export type ModelSeed = {
  id: string;
  title: string;
  description: string;
  fields: ModelField[];
  x: number;
  y: number;
  role: EntityRole;
  dependency: Dependency;
  hasPrivacy: boolean;
  maturedLevel: number;
  rotation: number;
};

export type Viewport = {
  x: number;
  y: number;
  scale: number;
};

export type DragState =
  | {
      type: "pan";
      pointerId: number;
      startX: number;
      startY: number;
      origin: Viewport;
    }
  | {
      type: "seed";
      pointerId: number;
      seedId: string;
      offsetX: number;
      offsetY: number;
      seedIds: string[];
      origins: Record<string, { x: number; y: number }>;
      groupLocked: boolean;
    }
  | {
      type: "relationship";
      pointerId: number;
      sourceId: string;
      x: number;
      y: number;
    }
  | null;
