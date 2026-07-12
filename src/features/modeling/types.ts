export type EntityRole = "master" | "transaction" | "summary" | "history" | "work";

export type Dependency = "independent" | "dependent";

export type NameDisplayMode = "business" | "system" | "physical";

export type NameSet = {
  business: string;
  system: string;
  physical: string;
};

export type NamingPolicy = {
  tablePluralization: "singular" | "plural";
  tableJoinMode: "separator" | "concatenate";
  tableSeparator: string;
  fieldJoinMode: "separator" | "concatenate";
  fieldSeparator: string;
  domainJoinMode: "separator" | "concatenate";
  domainSeparator: string;
};

export type VocabularyEntry = {
  id: string;
  businessName: string;
  systemName: string;
  physicalName: string;
  meaning: string;
  memo: string;
  aliases: string[];
};

export type VocabularySegment =
  | { type: "entry"; entryId: string; source: string; matchKind?: "preferred" | "alias" }
  | { type: "unmatched"; text: string };

export type VocabularyBinding = {
  sourceText: string;
  segments: VocabularySegment[];
  manual: boolean;
};

export type ModelField = {
  id: string;
  name: string;
  names?: NameSet;
  vocabularyBinding?: VocabularyBinding;
  primaryKey: boolean;
  important: boolean;
  domainId?: string;
  useDomainName?: boolean;
};

export type RefinementPatternId =
  | "extract-master"
  | "extract-domain"
  | "create-history"
  | "multiple-items"
  | "extract-optional"
  | "extract-one-to-one"
  | "split-code-set"
  | "create-work";

export type RefinementInput = {
  patternId: RefinementPatternId;
  sourceId: string;
  selectedFieldIds: string[];
  selectedRelationshipIds: string[];
  modelName: string;
  keyMode: "selected" | "new";
  keyFieldIds: string[];
  newKeyName: string;
  newKeyDomainId?: string;
  keepSnapshot: boolean;
  cardinality: "1:N" | "N:M";
  ordered: boolean;
  orderFieldName: string;
  historyStorage: "source" | "history" | "current";
  currentModelName: string;
  temporalMode: "instant" | "version" | "range";
  temporalNames: string[];
  inheritParent: boolean;
  domainName: string;
  similarModelIds: string[];
  codeSetModelNames: Record<string, string>;
};

export type RefinementResult = {
  seeds: ModelSeed[];
  relationships: Relationship[];
  relationshipReferences: RelationshipReference[];
  domains: DataDomain[];
  affectedSeedIds: string[];
  createdSeedIds: string[];
  summary: string[];
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
  | "uuid"
  | "code_set";

export type CodeSetBaseType = "varchar" | "decimal" | "integer";

export type CodeSetEntry = {
  id: string;
  name: string;
  value: string;
};

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
  names?: NameSet;
  vocabularyBinding?: VocabularyBinding;
  categoryId: string;
  shape: DomainShape;
  primitiveType?: PrimitiveType;
  bits?: 8 | 16 | 32 | 64;
  unsigned?: boolean;
  length?: number;
  precision?: number;
  scale?: number;
  codeSetBaseType?: CodeSetBaseType;
  codeSetEntries?: CodeSetEntry[];
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
export type RelationshipKind = "foreign-key" | "inherit" | "label";

export type Relationship = {
  id: string;
  name: string;
  sourceId: string;
  targetId: string;
  sourceMultiplicity: Multiplicity;
  targetMultiplicity: Multiplicity;
  direction: RelationshipDirection;
  kind: RelationshipKind;
};

export type RelationshipReference = {
  id: string;
  relationshipId: string;
  primaryKey: boolean;
  foreignKey: boolean;
  hiddenOnModelIds: string[];
};

export type CardDisplayMode = "description" | "key-fields";

export type ModelSeed = {
  id: string;
  title: string;
  names?: NameSet;
  vocabularyBinding?: VocabularyBinding;
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
      ready: boolean;
    }
  | {
      type: "relationship";
      pointerId: number;
      sourceId: string;
      x: number;
      y: number;
    }
  | null;
