import type { CanvasAnnotation } from "../features/annotations/types";
import type {
  CanvasModelPlacement,
  DataDomain,
  DfdCanvas,
  DfdFlow,
  DfdGroup,
  DfdNode,
  DomainCategory,
  ErdCanvas,
  ModelField,
  ModelSeed,
  Relationship,
  RelationshipReference,
  VocabularyEntry
} from "../features/modeling/types";
import type { CollaborationState, DurableOperation, DurableState, Timestamped } from "./types";

const BASE36_WIDTH = 9;

export class MonotonicTimer {
  private last = 0;

  newId() {
    this.last = Math.max(Date.now(), this.last + 1);
    return this.last.toString(36).padStart(BASE36_WIDTH, "0");
  }
}

type TimestampedModel = ModelSeed & Timestamped;

function created<T extends Timestamped>(value: T, timer: MonotonicTimer): T {
  return { ...value, timestamp: timer.newId() };
}

function ensured<T extends Timestamped>(value: T, timer: MonotonicTimer): T {
  return value.timestamp ? { ...value } : { ...value, timestamp: timer.newId() };
}

function existingOrCreated<T extends Timestamped & { id: string }>(value: T, previous: readonly T[], timer: MonotonicTimer): T {
  const current = previous.find((item) => item.id === value.id);
  return { ...value, timestamp: current?.timestamp ?? timer.newId() };
}

function existingPlacement(value: CanvasModelPlacement, previous: readonly CanvasModelPlacement[], timer: MonotonicTimer) {
  const current = previous.find((item) => item.canvasId === value.canvasId && item.seedId === value.seedId);
  return { ...value, timestamp: current?.timestamp ?? timer.newId() };
}

function modelWithTimestamps<T extends { id: string }>(value: T, previous: readonly T[], timer: MonotonicTimer, forceCreate = false): T {
  const current = forceCreate ? undefined : previous.find((item) => item.id === value.id);
  const model = value as T & Timestamped & { fields?: Array<ModelField & Timestamped> };
  const currentModel = current as (T & Timestamped & { fields?: Array<ModelField & Timestamped> }) | undefined;
  return {
    ...model,
    timestamp: currentModel?.timestamp ?? timer.newId(),
    ...(model.fields ? { fields: model.fields.map((field) => existingOrCreated(field, currentModel?.fields ?? [], timer)) } : {})
  } as T;
}

function ensuredModel<T extends { id: string }>(value: T, timer: MonotonicTimer): T {
  const model = value as T & Timestamped & { fields?: Array<ModelField & Timestamped> };
  return {
    ...model,
    timestamp: model.timestamp ?? timer.newId(),
    ...(model.fields ? { fields: model.fields.map((field) => ensured(field, timer)) } : {})
  } as T;
}

function timestampDfd(next: DurableState<unknown>["dfd"], current: DurableState<unknown>["dfd"], timer: MonotonicTimer) {
  return {
    ...next,
    canvases: next.canvases.map((item) => existingOrCreated(item as DfdCanvas & Timestamped, current.canvases as Array<DfdCanvas & Timestamped>, timer)),
    nodes: next.nodes.map((item) => existingOrCreated(item as DfdNode & Timestamped, current.nodes as Array<DfdNode & Timestamped>, timer)),
    flows: next.flows.map((item) => existingOrCreated(item as DfdFlow & Timestamped, current.flows as Array<DfdFlow & Timestamped>, timer)),
    groups: next.groups.map((item) => existingOrCreated(item as DfdGroup & Timestamped, current.groups as Array<DfdGroup & Timestamped>, timer))
  };
}

export function ensureStateTimestamps<T extends { id: string }>(state: DurableState<T>, timer: MonotonicTimer): DurableState<T> {
  return {
    ...structuredClone(state),
    canvases: state.canvases.map((item) => ensured(item as ErdCanvas & Timestamped, timer)),
    placements: state.placements.map((item) => ensured(item as CanvasModelPlacement & Timestamped, timer)),
    seeds: state.seeds.map((item) => ensuredModel(item, timer)),
    relationships: state.relationships.map((item) => ensured(item as Relationship & Timestamped, timer)),
    relationshipReferences: state.relationshipReferences.map((item) => ensured(item as RelationshipReference & Timestamped, timer)),
    domains: state.domains.map((item) => ensured(item as DataDomain & Timestamped, timer)),
    domainCategories: state.domainCategories.map((item) => ensured(item as DomainCategory & Timestamped, timer)),
    vocabularyEntries: state.vocabularyEntries.map((item) => ensured(item as VocabularyEntry & Timestamped, timer)),
    dfd: {
      ...state.dfd,
      canvases: state.dfd.canvases.map((item) => ensured(item, timer)),
      nodes: state.dfd.nodes.map((item) => ensured(item, timer)),
      flows: state.dfd.flows.map((item) => ensured(item, timer)),
      groups: state.dfd.groups.map((item) => ensured(item, timer))
    },
    annotations: state.annotations.map((item) => ensured(item as CanvasAnnotation & Timestamped, timer))
  } as DurableState<T>;
}

export function timestampDurableOperation<T extends { id: string }>(state: CollaborationState<T>, operation: DurableOperation<T>, timer: MonotonicTimer): DurableOperation<T> {
  switch (operation.type) {
    case "replace_project":
      return { ...operation, state: ensureStateTimestamps(operation.state, timer) };
    case "seed":
      return {
        ...operation,
        seed: modelWithTimestamps(operation.seed, state.seeds, timer, operation.create),
        ...(operation.create ? { placementTimestamp: timer.newId() } : {})
      };
    case "placement":
      return { ...operation, placement: operation.create ? created(operation.placement, timer) : existingPlacement(operation.placement, state.placements, timer) };
    case "canvas":
      return { ...operation, canvas: operation.create ? created(operation.canvas, timer) : existingOrCreated(operation.canvas, state.canvases, timer) };
    case "dfd":
      return { ...operation, dfd: timestampDfd(operation.dfd, state.dfd, timer) };
    case "ownership":
      return state.placements.some((item) => item.seedId === operation.seedId && item.canvasId === operation.targetCanvasId)
        ? operation
        : { ...operation, placementTimestamp: timer.newId() };
    case "domain":
      return { ...operation, domain: operation.create ? created(operation.domain, timer) : existingOrCreated(operation.domain, state.domains, timer) };
    case "domain_category":
      return { ...operation, category: operation.create ? created(operation.category, timer) : existingOrCreated(operation.category, state.domainCategories, timer) };
    case "vocabulary":
      return { ...operation, entry: operation.create ? created(operation.entry, timer) : existingOrCreated(operation.entry, state.vocabularyEntries, timer) };
    case "relationship":
      return {
        ...operation,
        relationship: operation.create ? created(operation.relationship, timer) : existingOrCreated(operation.relationship, state.relationships, timer),
        reference: operation.create ? created(operation.reference, timer) : existingOrCreated(operation.reference, state.relationshipReferences, timer)
      };
    case "refinement":
      return {
        ...operation,
        result: {
          ...operation.result,
          seeds: operation.result.seeds.map((item) => modelWithTimestamps(item, state.seeds as unknown as TimestampedModel[], timer)),
          relationships: operation.result.relationships.map((item) => existingOrCreated(item, state.relationships, timer)),
          relationshipReferences: operation.result.relationshipReferences.map((item) => existingOrCreated(item, state.relationshipReferences, timer)),
          domains: operation.result.domains.map((item) => existingOrCreated(item, state.domains, timer))
        }
      };
    case "annotation":
      return { ...operation, annotation: operation.create ? created(operation.annotation, timer) : existingOrCreated(operation.annotation, state.annotations, timer) };
    case "naming_policy":
      return operation;
  }
}
