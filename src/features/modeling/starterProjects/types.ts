import type { DfdFlow, DfdNode, EntityRole, PrimitiveType, Relationship } from "../types.ts";

export type StarterProjectLevel = "Simple" | "Intermediate" | "Advanced";

export type DomainSpec = {
  name: string;
  primitiveType: PrimitiveType;
  length?: number;
  values?: string[];
};

export type FieldSpec = {
  name: string;
  domain: string;
  primaryKey?: boolean;
  required?: boolean;
  unique?: boolean;
};

export type ModelSpec = {
  id: string;
  name: string;
  description: string;
  role: EntityRole;
  dependent?: boolean;
  privacy?: boolean;
  fields: FieldSpec[];
};

export type RelationshipSpec = {
  id: string;
  name: string;
  sourceId: string;
  targetId: string;
  sourceMultiplicity: Relationship["sourceMultiplicity"];
  targetMultiplicity: Relationship["targetMultiplicity"];
  kind?: Relationship["kind"];
};

export type DfdNodeSpec = Pick<DfdNode, "id" | "kind" | "name" | "modelId" | "processKind"> & Partial<Pick<DfdNode, "x" | "y">>;
export type DfdFlowSpec = Pick<DfdFlow, "id" | "sourceId" | "destinationId" | "label" | "crudAssignments">;

export type ProjectSpec<Id extends string = string> = {
  id: Id;
  title: string;
  description: string;
  level: StarterProjectLevel;
  words: string[];
  domains: DomainSpec[];
  models: ModelSpec[];
  relationships: RelationshipSpec[];
  dfd: {
    name: string;
    nodes: DfdNodeSpec[];
    flows: DfdFlowSpec[];
  };
};
