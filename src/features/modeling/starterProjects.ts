import type { DurableState } from "../../collaboration/types";
import { initialDomainCategories, initialDomains } from "./constants.ts";
import { projectSpecs, type RegisteredStarterProjectId } from "./starterProjects/registry.ts";
import type { DomainSpec, FieldSpec, ModelSpec, ProjectSpec, RelationshipSpec, StarterProjectLevel } from "./starterProjects/types.ts";
import type { DataDomain, DfdFlow, DfdNode, ModelField, ModelSeed, NamingPolicy, Relationship, RelationshipReference, VocabularyEntry } from "./types";
import { resolveVocabularyBinding } from "./vocabulary.ts";

export type StarterProjectId = "empty" | RegisteredStarterProjectId;

export type StarterProjectSummary = {
  id: StarterProjectId;
  title: string;
  description: string;
  level: "Blank" | StarterProjectLevel;
  modelCount: number;
  domainCount: number;
  vocabularyCount: number;
  erdCanvasCount: number;
  dfdCanvasCount: number;
};

const namingPolicy: NamingPolicy = {
  tablePluralization: "singular",
  tableJoinMode: "separator",
  tableSeparator: "_",
  fieldJoinMode: "separator",
  fieldSeparator: "_",
  domainJoinMode: "concatenate",
  domainSeparator: "_"
};

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function vocabulary(words: string[]): VocabularyEntry[] {
  return words.map((word) => ({
    id: `vocabulary-${slug(word)}`,
    businessName: word,
    systemName: word === "Identifier" ? "Id" : word,
    physicalName: word === "Identifier" ? "id" : slug(word).replace(/-/g, "_"),
    meaning: "",
    memo: "",
    aliases: []
  }));
}

function namesAndBinding(name: string, entries: VocabularyEntry[]) {
  const parts = name
    .split(/\s+/)
    .map((part) => entries.find((entry) => entry.businessName.toLowerCase() === part.toLowerCase()))
    .filter((entry): entry is VocabularyEntry => Boolean(entry));
  return {
    names: {
      business: name,
      system: parts.map((entry) => entry.systemName).join(""),
      physical: parts.map((entry) => entry.physicalName).join("_")
    },
    vocabularyBinding: resolveVocabularyBinding(name, entries)
  };
}

function makeDomains(specs: DomainSpec[], entries: VocabularyEntry[]): DataDomain[] {
  return [
    ...initialDomains.map((domain) => structuredClone(domain)),
    ...specs.map((spec) => ({
      id: `domain-${slug(spec.name)}`,
      name: spec.name,
      ...namesAndBinding(spec.name, entries),
      categoryId: "starter-domains",
      shape: "scalar" as const,
      primitiveType: spec.primitiveType,
      length: spec.length,
      codeSetBaseType: spec.primitiveType === "code_set" ? "varchar" as const : undefined,
      codeSetEntries: spec.values?.map((value) => ({ id: `code-${slug(spec.name)}-${slug(value)}`, name: value, value })),
      components: []
    }))
  ];
}

function makeFields(modelId: string, specs: FieldSpec[], domains: DataDomain[], entries: VocabularyEntry[]): ModelField[] {
  return specs.map((spec, index) => ({
    id: `${modelId}-field-${index + 1}-${slug(spec.name)}`,
    name: spec.name,
    ...namesAndBinding(spec.name, entries),
    primaryKey: spec.primaryKey ?? false,
    important: spec.primaryKey ?? false,
    domainId: domains.find((domain) => domain.name === spec.domain)?.id,
    required: spec.required ?? false,
    unique: spec.unique ?? false
  }));
}

function makeModels(specs: ModelSpec[], domains: DataDomain[], entries: VocabularyEntry[]): ModelSeed[] {
  return specs.map((spec, index) => ({
    id: spec.id,
    title: spec.name,
    ...namesAndBinding(spec.name, entries),
    description: spec.description,
    fields: makeFields(spec.id, spec.fields, domains, entries),
    x: 80 + (index % 3) * 360,
    y: 60 + Math.floor(index / 3) * 270,
    role: spec.role,
    dependency: spec.dependent ? "dependent" : "independent",
    hasPrivacy: spec.privacy ?? false,
    maturedLevel: 0.5,
    rotation: ((index % 3) - 1) * 0.25
  }));
}

function makeRelationships(specs: RelationshipSpec[]): { relationships: Relationship[]; relationshipReferences: RelationshipReference[] } {
  const relationships = specs.map((spec) => ({
    ...spec,
    direction: "source-to-target" as const,
    kind: spec.kind ?? "foreign-key" as const,
    onDelete: spec.kind === "composition" ? "cascade" as const : "no_action" as const
  }));
  return {
    relationships,
    relationshipReferences: relationships.map((relationship) => ({
      id: `${relationship.id}-reference`,
      relationshipId: relationship.id,
      primaryKey: false,
      foreignKey: true,
      hiddenOnModelIds: []
    }))
  };
}

function makeDfd(spec: ProjectSpec, models: ModelSeed[]) {
  const canvasId = `${spec.id}-dfd`;
  const nodes: DfdNode[] = spec.dfd.nodes.map((node, index) => ({
    ...node,
    definitionId: `${spec.id}-definition-${node.id}`,
    canvasId,
    description: "",
    x: node.x ?? 100 + (index % 4) * 330,
    y: node.y ?? 100 + Math.floor(index / 4) * 260
  }));
  const flows: DfdFlow[] = spec.dfd.flows.map((flow) => ({ ...flow, canvasId }));
  return {
    canvases: [{ id: canvasId, name: spec.dfd.name }],
    nodes,
    flows,
    groups: [],
    crudMatrix: {
      orientation: "processes_rows" as const,
      processOrder: nodes.filter((node) => node.kind === "process").map((node) => node.definitionId),
      modelOrder: models.map((model) => model.id)
    }
  };
}

function createEmptyState(): DurableState<ModelSeed> {
  return {
    canvases: [{ id: "main", name: "Main canvas" }],
    placements: [],
    seeds: [],
    relationships: [],
    relationshipReferences: [],
    domains: initialDomains.map((domain) => structuredClone(domain)),
    domainCategories: initialDomainCategories.map((category) => structuredClone(category)),
    namingPolicy: structuredClone(namingPolicy),
    vocabularyEntries: [],
    dfd: {
      canvases: [{ id: "dfd-main", name: "Main data flow" }],
      nodes: [],
      flows: [],
      groups: [],
      crudMatrix: { orientation: "processes_rows", processOrder: [], modelOrder: [] }
    },
    annotations: []
  };
}

function createState(spec: ProjectSpec): DurableState<ModelSeed> {
  const entries = vocabulary(spec.words);
  const domains = makeDomains(spec.domains, entries);
  const models = makeModels(spec.models, domains, entries);
  const relationState = makeRelationships(spec.relationships);
  const canvasId = `${spec.id}-erd`;
  return {
    canvases: [{ id: canvasId, name: `${spec.title} data model` }],
    placements: models.map((model) => ({ canvasId, seedId: model.id, x: model.x, y: model.y, accessMode: "owner" })),
    seeds: models,
    ...relationState,
    domains,
    domainCategories: [
      ...initialDomainCategories.map((category) => structuredClone(category)),
      { id: "starter-domains", name: "Starter Domains" }
    ],
    namingPolicy: structuredClone(namingPolicy),
    vocabularyEntries: entries,
    dfd: makeDfd(spec, models),
    annotations: []
  };
}

export function createStarterProjectState(id: StarterProjectId): DurableState<ModelSeed> {
  if (id === "empty") return createEmptyState();
  const spec = projectSpecs.find((candidate) => candidate.id === id);
  if (!spec) throw new Error(`Unknown starter project: ${id}`);
  return createState(spec);
}

export const starterProjects: StarterProjectSummary[] = [
  {
    id: "empty",
    title: "Empty",
    description: "A blank project with one empty ERD and DFD canvas.",
    level: "Blank",
    modelCount: 0,
    domainCount: 0,
    vocabularyCount: 0,
    erdCanvasCount: 1,
    dfdCanvasCount: 1
  },
  ...projectSpecs.map((spec) => ({
    id: spec.id,
    title: spec.title,
    description: spec.description,
    level: spec.level,
    modelCount: spec.models.length,
    domainCount: spec.domains.length,
    vocabularyCount: spec.words.length,
    erdCanvasCount: 1,
    dfdCanvasCount: 1
  }))
];
