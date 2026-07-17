import type { CanvasAnnotation } from "../features/annotations/types";
import type { CanvasModelPlacement, DataDomain, DomainCategory, Relationship, VocabularyEntry } from "../features/modeling/types";
import type { ModelSeed } from "../features/modeling/types";
import { applyAutomaticMaturity } from "../features/modeling/maturity.ts";
import { normalizeRelationshipSemantics } from "../features/modeling/utils.ts";
import type { CollaborationState, DurableOperation, EphemeralOperation } from "./types";

export class OperationError extends Error {}

function replaceByID<T extends { id: string }>(items: T[], value: T, create: boolean): T[] {
  const index = items.findIndex((item) => item.id === value.id);
  if (create && index >= 0) throw new OperationError("item already exists");
  if (!create && index < 0) throw new OperationError("item not found");
  if (index < 0) return [...items, value];
  return items.map((item, itemIndex) => itemIndex === index ? value : item);
}

function requireLocks<T>(state: CollaborationState<T>, actorID: string, seedIDs: string[]) {
  for (const seedID of new Set(seedIDs)) {
    if (state.locks[seedID]?.id !== actorID) throw new OperationError("model lock required");
  }
}

function applyDomain(domains: DataDomain[], domain: DataDomain, create: boolean, remove: boolean) {
  const index = domains.findIndex((item) => item.id === domain.id);
  if (remove) {
    if (index < 0) throw new OperationError("domain not found");
    return domains.filter((item) => item.id !== domain.id);
  }
  if (!domain.name.trim()) throw new OperationError("domain name required");
  if (domains.some((item) => item.id !== domain.id && item.name.toLowerCase() === domain.name.toLowerCase())) throw new OperationError("domain name already exists");
  return replaceByID(domains, domain, create);
}

function applyCategory(categories: DomainCategory[], category: DomainCategory, create: boolean) {
  if (!category.name.trim()) throw new OperationError("category name required");
  if (categories.some((item) => item.id !== category.id && item.name.toLowerCase() === category.name.toLowerCase())) throw new OperationError("category name already exists");
  return replaceByID(categories, category, create);
}

function applyVocabulary(entries: VocabularyEntry[], entry: VocabularyEntry, create: boolean, remove: boolean) {
  if (remove) return entries.filter((item) => item.id !== entry.id);
  const terms = [entry.businessName, entry.systemName, entry.physicalName, ...entry.aliases].map((term) => term.trim().toLowerCase()).filter(Boolean);
  const occupied = new Set(entries.filter((item) => item.id !== entry.id).flatMap((item) => [item.businessName, item.systemName, item.physicalName, ...item.aliases].map((term) => term.trim().toLowerCase()).filter(Boolean)));
  if (terms.some((term) => occupied.has(term))) throw new OperationError("vocabulary term already exists");
  return replaceByID(entries, entry, create);
}

function applyRelationship(relationships: Relationship[], relationship: Relationship, create: boolean, remove: boolean) {
  if (remove) return relationships.filter((item) => item.id !== relationship.id);
  const normalized = normalizeRelationshipSemantics(relationship);
  if (!normalized.name || normalized.sourceId === normalized.targetId || !["foreign-key", "inherit", "label", "composition"].includes(normalized.kind)) throw new OperationError("invalid relationship");
  if (normalized.kind === "composition" && relationships.some((item) => item.id !== normalized.id && item.kind === "composition" && item.targetId === normalized.targetId)) {
    throw new OperationError("composition child already has an owner");
  }
  return replaceByID(relationships, normalized, create);
}

function normalizeRelationshipGraph(relationships: Relationship[]) {
  const compositionChildren = new Set<string>();
  return relationships.map((relationship) => {
    const normalized = normalizeRelationshipSemantics(relationship);
    if (!normalized.name || normalized.sourceId === normalized.targetId || !["foreign-key", "inherit", "label", "composition"].includes(normalized.kind)) throw new OperationError("invalid relationship");
    if (normalized.kind === "composition") {
      if (compositionChildren.has(normalized.targetId)) throw new OperationError("composition child already has an owner");
      compositionChildren.add(normalized.targetId);
    }
    return normalized;
  });
}

function applyAnnotation(annotations: CanvasAnnotation[], annotation: CanvasAnnotation, create: boolean, remove: boolean) {
  if (remove) return annotations.filter((item) => item.id !== annotation.id);
  return replaceByID(annotations, annotation, create);
}

function removeModel<T extends { id: string }>(state: CollaborationState<T>, seedId: string, canvasId: string, actorID: string, validate: boolean): CollaborationState<T> {
  const placement = state.placements.find((item) => item.seedId === seedId && item.canvasId === canvasId);
  if (!placement) throw new OperationError("model placement not found");
  if (placement.accessMode === "readonly") {
    return {
      ...state,
      placements: state.placements.filter((item) => item !== placement),
      annotations: state.annotations.filter((annotation) => annotation.canvasType !== "erd" || annotation.canvasId !== canvasId || (annotation.start?.itemId !== seedId && annotation.end?.itemId !== seedId))
    };
  }
  if (validate) requireLocks(state, actorID, [seedId]);
  const removedRelationships = new Set(state.relationships.filter((item) => item.sourceId === seedId || item.targetId === seedId).map((item) => item.id));
  const removedDfdNodes = new Set(state.dfd.nodes.filter((node) => node.modelId === seedId).map((node) => node.id));
  const nextGroups = state.dfd.groups.map((group) => ({ ...group, memberIds: group.memberIds.filter((id) => !removedDfdNodes.has(id)) })).filter((group) => group.memberIds.length > 0);
  const removedGroups = new Set(state.dfd.groups.filter((group) => !nextGroups.some((next) => next.id === group.id)).map((group) => group.id));
  const removedDfdEndpoints = new Set([...removedDfdNodes, ...removedGroups]);
  const locks = { ...state.locks };
  delete locks[seedId];
  return {
    ...state,
    seeds: state.seeds.filter((seed) => seed.id !== seedId),
    placements: state.placements.filter((item) => item.seedId !== seedId),
    relationships: state.relationships.filter((item) => !removedRelationships.has(item.id)),
    relationshipReferences: state.relationshipReferences.filter((item) => !removedRelationships.has(item.relationshipId)),
    dfd: {
      ...state.dfd,
      nodes: state.dfd.nodes.filter((node) => !removedDfdNodes.has(node.id)),
      flows: state.dfd.flows.filter((flow) => !removedDfdEndpoints.has(flow.sourceId) && !removedDfdEndpoints.has(flow.destinationId)).map((flow) => ({
        ...flow,
        crudAssignments: flow.crudAssignments?.filter((assignment) => assignment.modelId !== seedId)
      })),
      groups: nextGroups,
      crudMatrix: state.dfd.crudMatrix ? { ...state.dfd.crudMatrix, modelOrder: state.dfd.crudMatrix.modelOrder.filter((id) => id !== seedId) } : undefined
    },
    annotations: state.annotations.filter((annotation) => annotation.start?.itemId !== seedId && annotation.end?.itemId !== seedId && !removedDfdEndpoints.has(annotation.start?.itemId ?? "") && !removedDfdEndpoints.has(annotation.end?.itemId ?? "")),
    locks
  };
}

function applyDurableOperationCore<T extends { id: string; x?: number; y?: number }>(state: CollaborationState<T>, operation: DurableOperation<T>, actorID: string, validate = true): CollaborationState<T> {
  switch (operation.type) {
    case "replace_project":
      return { ...structuredClone(operation.state), users: state.users, locks: {} };
    case "seed": { // eslint-disable-line no-fallthrough
      const exists = state.seeds.some((seed) => seed.id === operation.seed.id);
      if (validate && exists && !operation.create) requireLocks(state, actorID, [operation.seed.id]);
      const seeds = replaceByID(state.seeds, operation.seed, operation.create);
      if (operation.catalog || exists) return { ...state, seeds };
      const placement: CanvasModelPlacement = { timestamp: operation.placementTimestamp, canvasId: operation.canvasId, seedId: operation.seed.id, x: operation.seed.x ?? 0, y: operation.seed.y ?? 0, accessMode: "owner" };
      return { ...state, seeds, placements: [...state.placements, placement] };
    }
    case "placement": {
      const keyMatches = (item: CanvasModelPlacement) => item.canvasId === operation.placement.canvasId && item.seedId === operation.placement.seedId;
      const index = state.placements.findIndex(keyMatches);
      if (validate && index >= 0 && !operation.create) requireLocks(state, actorID, [operation.placement.seedId]);
      if (operation.create && index >= 0) throw new OperationError("placement already exists");
      if (!operation.create && index < 0) throw new OperationError("placement not found");
      const placements = index < 0 ? [...state.placements, operation.placement] : state.placements.map((item, itemIndex) => itemIndex === index ? { ...operation.placement, accessMode: item.accessMode } : item);
      return { ...state, placements };
    }
    case "remove_model":
      return removeModel(state, operation.seedId, operation.canvasId, actorID, validate);
    case "canvas":
      return { ...state, canvases: replaceByID(state.canvases, operation.canvas, operation.create) };
    case "dfd":
      return { ...state, dfd: structuredClone(operation.dfd) };
    case "ownership": {
      const currentOwner = state.placements.find((item) => item.seedId === operation.seedId && item.accessMode === "owner");
      if (!currentOwner || currentOwner.canvasId !== operation.expectedOwnerId) throw new OperationError("model ownership changed");
      let placements = state.placements;
      if (!placements.some((item) => item.seedId === operation.seedId && item.canvasId === operation.targetCanvasId)) {
        const seed = state.seeds.find((item) => item.id === operation.seedId);
        if (!seed) throw new OperationError("model not found");
        placements = [...placements, { timestamp: operation.placementTimestamp, canvasId: operation.targetCanvasId, seedId: operation.seedId, x: seed.x ?? 0, y: seed.y ?? 0, accessMode: "readonly" }];
      }
      placements = placements.map((item) => item.seedId !== operation.seedId ? item : { ...item, accessMode: item.canvasId === operation.targetCanvasId ? "owner" : "readonly" });
      const locks = { ...state.locks };
      delete locks[operation.seedId];
      return { ...state, placements, locks };
    }
    case "domain":
      return { ...state, domains: applyDomain(state.domains, operation.domain, operation.create, operation.delete) };
    case "domain_category":
      return { ...state, domainCategories: applyCategory(state.domainCategories, operation.category, operation.create) };
    case "naming_policy":
      return { ...state, namingPolicy: operation.policy };
    case "vocabulary":
      return { ...state, vocabularyEntries: applyVocabulary(state.vocabularyEntries, operation.entry, operation.create, operation.delete) };
    case "relationship": {
      if (validate) requireLocks(state, actorID, [operation.relationship.sourceId, operation.relationship.targetId]);
      const relationships = applyRelationship(state.relationships, operation.relationship, operation.create, operation.delete);
      const relationshipReferences = operation.delete
        ? state.relationshipReferences.filter((item) => item.relationshipId !== operation.relationship.id)
        : replaceByID(state.relationshipReferences, operation.reference, operation.create);
      return { ...state, relationships, relationshipReferences };
    }
    case "refinement": {
      if (validate) requireLocks(state, actorID, operation.result.affectedSeedIds);
      return {
        ...state,
        seeds: structuredClone(operation.result.seeds) as unknown as T[],
        relationships: structuredClone(normalizeRelationshipGraph(operation.result.relationships)),
        relationshipReferences: structuredClone(operation.result.relationshipReferences),
        domains: structuredClone(operation.result.domains)
      };
    }
    case "annotation":
      return { ...state, annotations: applyAnnotation(state.annotations, operation.annotation, operation.create, operation.delete) };
  }
}

function isModelSeed(value: { id: string }): value is ModelSeed {
  const candidate = value as Partial<ModelSeed>;
  return typeof candidate.title === "string" && typeof candidate.description === "string" && Array.isArray(candidate.fields);
}

export function applyAutomaticMaturityToState<T extends { id: string }>(state: CollaborationState<T>): CollaborationState<T> {
  if (!state.seeds.every(isModelSeed)) return state;
  return { ...state, seeds: applyAutomaticMaturity(state.seeds as unknown as ModelSeed[], state.domains, state.vocabularyEntries) as unknown as T[] };
}

export function applyDurableOperation<T extends { id: string; x?: number; y?: number }>(state: CollaborationState<T>, operation: DurableOperation<T>, actorID: string, validate = true): CollaborationState<T> {
  const next = applyDurableOperationCore(state, operation, actorID, validate);
  return applyAutomaticMaturityToState(next);
}

export function applyEphemeralOperation<T>(state: CollaborationState<T>, operation: EphemeralOperation, actorID: string): CollaborationState<T> {
  const actor = state.users.find((user) => user.id === actorID);
  if (!actor) throw new OperationError("unknown collaborator");
  if (operation.type === "presence") {
    const updatedActor = { ...actor, ...operation.patch };
    const users = state.users.map((user) => user.id === actorID ? updatedActor : user);
    const locks = Object.fromEntries(Object.entries(state.locks).map(([seedID, owner]) => [seedID, owner.id === actorID ? updatedActor : owner]));
    return { ...state, users, locks };
  }
  const locks = { ...state.locks };
  if (operation.type === "lock") {
    for (const seedID of new Set(operation.seedIds)) {
      if (locks[seedID] && locks[seedID].id !== actorID) throw new OperationError("model locked by another collaborator");
    }
    for (const seedID of new Set(operation.seedIds)) locks[seedID] = actor;
  } else {
    for (const seedID of new Set(operation.seedIds)) if (locks[seedID]?.id === actorID) delete locks[seedID];
  }
  return { ...state, locks };
}
