import type { CrudOperation, DfdCrudAssignment, DfdFlow, DfdGroup, DfdGroupKind, DfdNode, DfdPhysicalProcess, DfdState, EntityRole, ModelSeed } from "../modeling/types";

export type DfdBounds = { x: number; y: number; width: number; height: number };
export type DfdWarning = { id: string; message: string; nodeId?: string };

export const DFD_NODE_SIZE: Record<DfdNode["kind"], { width: number; height: number }> = {
  process: { width: 184, height: 96 },
  model: { width: 154, height: 108 },
  external: { width: 184, height: 82 },
  intermediate: { width: 154, height: 108 }
};

export function dfdNodeClass(node: DfdNode): DfdGroupKind | "external" {
  if (node.kind === "process") return "process";
  if (node.kind === "external") return "external";
  return "data_entity";
}

export function endpointContainsModel(id: string, nodes: DfdNode[], groups: DfdGroup[]) {
  const memberIds = groups.find((group) => group.id === id)?.memberIds ?? [id];
  return memberIds.some((memberId) => nodes.find((node) => node.id === memberId)?.kind === "model");
}

export type DfdCrudSpec = {
  processUnitId: string;
  processNodeId: string;
  modelId: string;
  modelNodeId: string;
  allowed: CrudOperation[];
  defaults: CrudOperation[];
};

const crudOrder: CrudOperation[] = ["C", "R", "U", "D"];

export function reconcilePhysicalProcesses(current: DfdPhysicalProcess[] | undefined, names: string[]): DfdPhysicalProcess[] {
  const available = [...(current ?? [])];
  return names.map((name) => {
    const sameNameIndex = available.findIndex((item) => item.name === name);
    const matched = sameNameIndex >= 0 ? available.splice(sameNameIndex, 1)[0] : available.shift();
    return { id: matched?.id ?? crypto.randomUUID(), name };
  });
}

export function processUnits(node: DfdNode) {
  return node.physicalProcesses?.length
    ? node.physicalProcesses.map((physical) => ({ id: physical.id, name: physical.name, nodeId: node.id }))
    : [{ id: node.definitionId, name: node.name, nodeId: node.id }];
}

export function expandedEndpointNodes(id: string, nodes: DfdNode[], groups: DfdGroup[]) {
  const ids = groups.find((group) => group.id === id)?.memberIds ?? [id];
  return ids.map((nodeId) => nodes.find((node) => node.id === nodeId)).filter((node): node is DfdNode => Boolean(node));
}

export function crudAssignmentSpecs(flow: DfdFlow, nodes: DfdNode[], groups: DfdGroup[]): DfdCrudSpec[] {
  const specs = new Map<string, DfdCrudSpec>();
  const addDirection = (fromId: string, toId: string) => {
    for (const from of expandedEndpointNodes(fromId, nodes, groups)) for (const to of expandedEndpointNodes(toId, nodes, groups)) {
      const process = from.kind === "process" && to.kind === "model" ? from : from.kind === "model" && to.kind === "process" ? to : undefined;
      const model = from.kind === "model" && to.kind === "process" ? from : from.kind === "process" && to.kind === "model" ? to : undefined;
      if (!process || !model?.modelId) continue;
      const allowed: CrudOperation[] = from.kind === "process" ? ["C", "U", "D"] : ["R"];
      const defaults: CrudOperation[] = from.kind === "process" ? ["C"] : ["R"];
      for (const unit of processUnits(process)) {
        const key = `${unit.id}\0${model.modelId}`;
        const existing = specs.get(key);
        if (existing) {
          existing.allowed = crudOrder.filter((operation) => existing.allowed.includes(operation) || allowed.includes(operation));
          existing.defaults = crudOrder.filter((operation) => existing.defaults.includes(operation) || defaults.includes(operation));
        } else {
          specs.set(key, { processUnitId: unit.id, processNodeId: process.id, modelId: model.modelId, modelNodeId: model.id, allowed, defaults });
        }
      }
    }
  };
  addDirection(flow.sourceId, flow.destinationId);
  if (flow.bidirectional) addDirection(flow.destinationId, flow.sourceId);
  return [...specs.values()].map((spec) => ({ ...spec, defaults: crudOrder.filter((operation) => spec.defaults.includes(operation)) }));
}

function normalizeOperations(operations: CrudOperation[] | undefined, allowed: CrudOperation[], defaults: CrudOperation[]) {
  const normalized = crudOrder.filter((operation) => allowed.includes(operation) && operations?.includes(operation));
  return normalized.length ? normalized : defaults;
}

export function normalizeFlowCrud(flow: DfdFlow, nodes: DfdNode[], groups: DfdGroup[]): DfdFlow {
  const existing = new Map((flow.crudAssignments ?? []).map((assignment) => [`${assignment.processUnitId}\0${assignment.modelId}`, assignment]));
  const specs = crudAssignmentSpecs(flow, nodes, groups);
  const crudAssignments = specs.map((spec): DfdCrudAssignment => {
    let operations = existing.get(`${spec.processUnitId}\0${spec.modelId}`)?.operations;
    if (!operations?.length && spec.allowed.includes("R") && flow.sourceCrud === "R") operations = ["R"];
    if (!operations?.length && spec.allowed.includes("C") && flow.destinationCrud?.length) operations = flow.destinationCrud;
    return { processUnitId: spec.processUnitId, modelId: spec.modelId, operations: normalizeOperations(operations, spec.allowed, spec.defaults) };
  });
  const { sourceCrud: _sourceCrud, destinationCrud: _destinationCrud, ...current } = flow;
  return { ...current, crudAssignments: crudAssignments.length ? crudAssignments : undefined };
}

export function withModelCrud(flow: DfdFlow, nodes: DfdNode[], groups: DfdGroup[]): DfdFlow {
  return normalizeFlowCrud(flow, nodes, groups);
}

export function normalizeDfdCrud(state: DfdState): DfdState {
  return { ...state, flows: state.flows.map((flow) => normalizeFlowCrud(flow, state.nodes, state.groups)) };
}

export function modelEndpointCrud(flow: DfdFlow, endpointId: string, nodes: DfdNode[], groups: DfdGroup[]): CrudOperation[] {
  if (!endpointContainsModel(endpointId, nodes, groups)) return [];
  const assigned = new Set((flow.crudAssignments ?? []).flatMap((assignment) => assignment.operations));
  if (assigned.size > 0) return crudOrder.filter((operation) => assigned.has(operation));
  const defaults = new Set<CrudOperation>();
  if (flow.sourceId === endpointId) defaults.add("R");
  if (flow.destinationId === endpointId) defaults.add("C");
  if (flow.bidirectional) {
    if (flow.sourceId === endpointId) defaults.add("C");
    if (flow.destinationId === endpointId) defaults.add("R");
  }
  return crudOrder.filter((operation) => defaults.has(operation));
}

export function nodeBounds(node: DfdNode): DfdBounds {
  const size = DFD_NODE_SIZE[node.kind];
  return { x: node.x, y: node.y, ...size };
}

export function groupBounds(group: DfdGroup, nodes: DfdNode[]): DfdBounds {
  const members = group.memberIds.map((id) => nodes.find((node) => node.id === id)).filter((node): node is DfdNode => Boolean(node));
  if (members.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  const bounds = members.map(nodeBounds);
  const minX = Math.min(...bounds.map((item) => item.x));
  const minY = Math.min(...bounds.map((item) => item.y));
  const maxX = Math.max(...bounds.map((item) => item.x + item.width));
  const maxY = Math.max(...bounds.map((item) => item.y + item.height));
  return { x: minX - 22, y: minY - 30, width: maxX - minX + 44, height: maxY - minY + 52 };
}

export function endpointBounds(id: string, nodes: DfdNode[], groups: DfdGroup[]): DfdBounds | undefined {
  const node = nodes.find((item) => item.id === id);
  if (node) return nodeBounds(node);
  const group = groups.find((item) => item.id === id);
  return group ? groupBounds(group, nodes) : undefined;
}

export function endpointClass(id: string, nodes: DfdNode[], groups: DfdGroup[]): DfdGroupKind | "external" | undefined {
  const node = nodes.find((item) => item.id === id);
  if (node) return dfdNodeClass(node);
  return groups.find((item) => item.id === id)?.kind;
}

export function validEndpointPair(sourceId: string, destinationId: string, nodes: DfdNode[], groups: DfdGroup[]) {
  const source = endpointClass(sourceId, nodes, groups);
  const destination = endpointClass(destinationId, nodes, groups);
  if (!source || !destination || source === destination) return false;
  return source === "external" || destination === "external" || source === "process" || destination === "process";
}

export function overlaps(first: DfdNode, second: DfdNode) {
  const a = nodeBounds(first);
  const b = nodeBounds(second);
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function groupAfterOverlap(state: DfdState, draggedId: string): DfdState {
  const dragged = state.nodes.find((node) => node.id === draggedId);
  if (!dragged || dfdNodeClass(dragged) === "external") return state;
  const target = state.nodes.find((node) => node.id !== dragged.id && node.canvasId === dragged.canvasId && dfdNodeClass(node) === dfdNodeClass(dragged) && overlaps(dragged, node));
  if (!target) return state;
  const draggedGroup = state.groups.find((group) => group.memberIds.includes(dragged.id));
  const targetGroup = state.groups.find((group) => group.memberIds.includes(target.id));
  const mergedIDs = [...new Set([...(draggedGroup?.memberIds ?? [dragged.id]), ...(targetGroup?.memberIds ?? [target.id])])];
  const groupId = targetGroup?.id ?? draggedGroup?.id ?? crypto.randomUUID();
  const baseX = Math.min(...mergedIDs.map((id) => state.nodes.find((node) => node.id === id)!.x));
  const baseY = Math.min(...mergedIDs.map((id) => state.nodes.find((node) => node.id === id)!.y));
  const nodes = state.nodes.map((node) => {
    const index = mergedIDs.indexOf(node.id);
    if (index < 0) return node;
    return { ...node, x: baseX, y: baseY + index * (DFD_NODE_SIZE[node.kind].height + 18) };
  });
  const groups = state.groups.filter((group) => group.id !== draggedGroup?.id && group.id !== targetGroup?.id);
  groups.push({ id: groupId, canvasId: dragged.canvasId, kind: dfdNodeClass(dragged) as DfdGroupKind, memberIds: mergedIDs });
  const replacedGroupIDs = new Set([draggedGroup?.id, targetGroup?.id].filter((id): id is string => Boolean(id)));
  const deduplicated = new Map<string, DfdFlow>();
  for (const flow of state.flows) {
    const sourceId = mergedIDs.includes(flow.sourceId) || replacedGroupIDs.has(flow.sourceId) ? groupId : flow.sourceId;
    const destinationId = mergedIDs.includes(flow.destinationId) || replacedGroupIDs.has(flow.destinationId) ? groupId : flow.destinationId;
    if (sourceId === destinationId) continue;
    const next = { ...flow, sourceId, destinationId };
    const key = [next.canvasId, next.sourceId, next.destinationId, next.label ?? "", next.protocol ?? "", String(Boolean(next.bidirectional))].join("\x00");
    const existing = deduplicated.get(key);
    if (!existing) deduplicated.set(key, next);
    else deduplicated.set(key, { ...existing, crudAssignments: [...(existing.crudAssignments ?? []), ...(next.crudAssignments ?? [])] });
  }
  return normalizeDfdCrud({ ...state, nodes, groups, flows: [...deduplicated.values()] });
}

function expandedEndpointIds(id: string, groups: DfdGroup[]) {
  return groups.find((group) => group.id === id)?.memberIds ?? [id];
}

export function dfdWarnings(state: DfdState, canvasId: string, seeds: ModelSeed[]): DfdWarning[] {
  const nodes = state.nodes.filter((node) => node.canvasId === canvasId);
  const flows = state.flows.filter((flow) => flow.canvasId === canvasId);
  const groups = state.groups.filter((group) => group.canvasId === canvasId);
  const incoming = new Map<string, number>();
  const outgoing = new Map<string, number>();
  for (const flow of flows) {
    for (const id of expandedEndpointIds(flow.sourceId, groups)) outgoing.set(id, (outgoing.get(id) ?? 0) + 1);
    for (const id of expandedEndpointIds(flow.destinationId, groups)) incoming.set(id, (incoming.get(id) ?? 0) + 1);
    if (flow.bidirectional) {
      for (const id of expandedEndpointIds(flow.sourceId, groups)) incoming.set(id, (incoming.get(id) ?? 0) + 1);
      for (const id of expandedEndpointIds(flow.destinationId, groups)) outgoing.set(id, (outgoing.get(id) ?? 0) + 1);
    }
  }
  const warnings: DfdWarning[] = [];
  for (const node of nodes) {
    const connections = (incoming.get(node.id) ?? 0) + (outgoing.get(node.id) ?? 0);
    if (connections === 0) warnings.push({ id: `orphan:${node.id}`, nodeId: node.id, message: `${node.name || "Unnamed node"} is not connected.` });
    if (dfdNodeClass(node) === "process" && (incoming.get(node.id) ?? 0) === 0) warnings.push({ id: `input:${node.id}`, nodeId: node.id, message: `${node.name} has no input flow.` });
    if (dfdNodeClass(node) === "process" && (outgoing.get(node.id) ?? 0) === 0) warnings.push({ id: `output:${node.id}`, nodeId: node.id, message: `${node.name} has no output flow.` });
  }
  for (const flow of flows) {
    const sourceIDs = expandedEndpointIds(flow.sourceId, groups);
    const destinationIDs = expandedEndpointIds(flow.destinationId, groups);
    if (sourceIDs.length * destinationIDs.length > 16) warnings.push({ id: `large:${flow.id}`, message: `A grouped flow expands to ${sourceIDs.length * destinationIDs.length} flows.` });
    const endpointIDs = [...sourceIDs, ...destinationIDs];
    const externalId = endpointIDs.find((id) => nodes.find((node) => node.id === id)?.kind === "external");
    const modelId = endpointIDs.find((id) => nodes.find((node) => node.id === id)?.kind === "model");
    if (!externalId || !modelId) continue;
    const modelNode = nodes.find((node) => node.id === modelId);
    const model = seeds.find((seed) => seed.id === modelNode?.modelId);
    if (model && model.role !== ("work" satisfies EntityRole)) warnings.push({ id: `external-work:${flow.id}:${model.id}`, nodeId: modelNode?.id, message: `${model.title} connects directly to an external entity but its role is ${model.role}, not work.` });
  }
  return warnings;
}
