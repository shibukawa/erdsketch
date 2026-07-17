import type { DfdFlow, DfdGroup, DfdNode } from "../modeling/types.ts";
import { endpointBounds, type DfdBounds } from "./dfd.ts";

export type DfdFlowRoute = {
  path: string;
  labelX: number;
  labelY: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  verticalSegments: Array<{ x: number; startY: number; endY: number }>;
};

type ResolvedFlow = {
  flow: DfdFlow;
  source: DfdBounds;
  destination: DfdBounds;
};

type AssignedVerticalSegment = {
  x: number;
  minY: number;
  maxY: number;
};

type PortGroup = {
  role: "source" | "destination";
  endpoint: DfdBounds;
  ports: Array<{ flowId: string; oppositeY: number }>;
};

const portMargin = 14;
const maximumPortGap = 12;
const routeInset = 24;
const directionSeparation = 9;
const laneGap = 18;
const laneClearance = 13;

function centerY(bounds: DfdBounds) {
  return bounds.y + bounds.height / 2;
}

function centeredPortYs(bounds: DfdBounds, count: number) {
  if (count <= 1) return [centerY(bounds)];
  const available = Math.max(0, bounds.height - portMargin * 2);
  const gap = Math.min(maximumPortGap, available / (count - 1));
  const first = centerY(bounds) - gap * (count - 1) / 2;
  return Array.from({ length: count }, (_, index) => first + gap * index);
}

function assignPortYs(resolvedFlows: ResolvedFlow[]) {
  const groups = new Map<string, PortGroup>();
  const addPort = (key: string, role: PortGroup["role"], endpoint: DfdBounds, flowId: string, oppositeY: number) => {
    const group = groups.get(key) ?? { role, endpoint, ports: [] };
    group.ports.push({ flowId, oppositeY });
    groups.set(key, group);
  };
  for (const { flow, source, destination } of resolvedFlows) {
    addPort(`source\0${flow.sourceId}`, "source", source, flow.id, centerY(destination));
    addPort(`destination\0${flow.destinationId}`, "destination", destination, flow.id, centerY(source));
  }

  const result = new Map<string, { startY: number; endY: number }>();
  for (const { role, endpoint, ports } of groups.values()) {
    ports.sort((first, second) => first.oppositeY - second.oppositeY || first.flowId.localeCompare(second.flowId));
    const ys = centeredPortYs(endpoint, ports.length);
    ports.forEach((port, index) => {
      const assignment = result.get(port.flowId) ?? { startY: 0, endY: 0 };
      if (role === "source") assignment.startY = ys[index];
      else assignment.endY = ys[index];
      result.set(port.flowId, assignment);
    });
  }
  return result;
}

function intervalsOverlap(first: AssignedVerticalSegment, second: AssignedVerticalSegment) {
  return first.minY <= second.maxY && second.minY <= first.maxY;
}

function verticalLaneCandidates(startX: number, endX: number, upward: boolean) {
  const minimum = startX + routeInset;
  const maximum = endX - routeInset;
  if (maximum <= minimum) {
    const distance = endX - startX;
    return [startX + distance * (upward ? 1 / 3 : 2 / 3)];
  }

  const middle = (minimum + maximum) / 2;
  const direction = upward ? -1 : 1;
  const preferred = middle + direction * Math.min(directionSeparation, (maximum - minimum) / 4);
  const candidates: number[] = [];
  for (let index = 0; ; index += 1) {
    const candidate = preferred + direction * laneGap * index;
    if (candidate < minimum || candidate > maximum) break;
    candidates.push(candidate);
  }
  return candidates.length ? candidates : [middle];
}

function chooseVerticalLane(startX: number, endX: number, startY: number, endY: number, assigned: AssignedVerticalSegment[]) {
  const segment = { x: 0, minY: Math.min(startY, endY), maxY: Math.max(startY, endY) };
  const candidates = verticalLaneCandidates(startX, endX, endY < startY);
  const collisionCount = (x: number) => assigned.filter((other) => intervalsOverlap({ ...segment, x }, other) && Math.abs(x - other.x) < laneClearance).length;
  return candidates.find((candidate) => collisionCount(candidate) === 0)
    ?? candidates.reduce((best, candidate) => collisionCount(candidate) < collisionCount(best) ? candidate : best, candidates[0]);
}

function buildForwardRoute(flow: ResolvedFlow, port: { startY: number; endY: number }, assigned: AssignedVerticalSegment[]): DfdFlowRoute {
  const startX = flow.source.x + flow.source.width;
  const endX = flow.destination.x;
  const { startY, endY } = port;
  if (Math.abs(startY - endY) <= 5) {
    return { path: `M ${startX} ${startY} H ${endX}`, labelX: (startX + endX) / 2, labelY: (startY + endY) / 2, startX, startY, endX, endY, verticalSegments: [] };
  }

  const verticalX = chooseVerticalLane(startX, endX, startY, endY, assigned);
  assigned.push({ x: verticalX, minY: Math.min(startY, endY), maxY: Math.max(startY, endY) });
  return {
    path: `M ${startX} ${startY} H ${verticalX} V ${endY} H ${endX}`,
    labelX: verticalX,
    labelY: (startY + endY) / 2,
    startX,
    startY,
    endX,
    endY,
    verticalSegments: [{ x: verticalX, startY, endY }]
  };
}

function buildReverseRoute(flow: ResolvedFlow, port: { startY: number; endY: number }, lane: number): DfdFlowRoute {
  const startX = flow.source.x + flow.source.width;
  const endX = flow.destination.x;
  const { startY, endY } = port;
  const laneOffset = lane * laneGap;
  const rightTurnX = startX + 52 + laneOffset;
  const leftTurnX = endX - 52 - laneOffset;
  const detourY = Math.min(flow.source.y, flow.destination.y) - 52 - laneOffset;
  return {
    path: `M ${startX} ${startY} H ${rightTurnX} V ${detourY} H ${leftTurnX} V ${endY} H ${endX}`,
    labelX: (rightTurnX + leftTurnX) / 2,
    labelY: detourY,
    startX,
    startY,
    endX,
    endY,
    verticalSegments: [
      { x: rightTurnX, startY, endY: detourY },
      { x: leftTurnX, startY: detourY, endY }
    ]
  };
}

export function buildDfdFlowRoutes(flows: DfdFlow[], nodes: DfdNode[], groups: DfdGroup[]) {
  const resolvedFlows = flows.flatMap((flow): ResolvedFlow[] => {
    const source = endpointBounds(flow.sourceId, nodes, groups);
    const destination = endpointBounds(flow.destinationId, nodes, groups);
    return source && destination ? [{ flow, source, destination }] : [];
  });
  const portYs = assignPortYs(resolvedFlows);
  const ordered = [...resolvedFlows].sort((first, second) => {
    const firstPort = portYs.get(first.flow.id)!;
    const secondPort = portYs.get(second.flow.id)!;
    return Math.min(firstPort.startY, firstPort.endY) - Math.min(secondPort.startY, secondPort.endY)
      || Math.max(firstPort.startY, firstPort.endY) - Math.max(secondPort.startY, secondPort.endY)
      || first.flow.id.localeCompare(second.flow.id);
  });
  const routes = new Map<string, DfdFlowRoute>();
  const assignedForwardSegments: AssignedVerticalSegment[] = [];
  let reverseLane = 0;
  for (const resolved of ordered) {
    const port = portYs.get(resolved.flow.id)!;
    const sourceCenter = resolved.source.x + resolved.source.width / 2;
    const destinationCenter = resolved.destination.x + resolved.destination.width / 2;
    const route = sourceCenter > destinationCenter
      ? buildReverseRoute(resolved, port, reverseLane++)
      : buildForwardRoute(resolved, port, assignedForwardSegments);
    routes.set(resolved.flow.id, route);
  }
  return routes;
}
