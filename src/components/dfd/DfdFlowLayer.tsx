import rough from "roughjs/bundled/rough.esm";
import { memo, useEffect, useMemo, useRef } from "react";
import type { DfdFlow, DfdGroup, DfdNode } from "../../features/modeling/types";
import { endpointBounds, modelEndpointCrud, type DfdBounds } from "../../features/dfd/dfd";

type Props = { flows: DfdFlow[]; nodes: DfdNode[]; groups: DfdGroup[]; selectedFlowId?: string; onSelect: (flowId: string) => void };
type FlowRoute = { path: string; labelX: number; labelY: number; startX: number; startY: number; endX: number; endY: number };

function buildFlowRoute(source: DfdBounds, destination: DfdBounds, sourceOffset: number, destinationOffset: number, reverseLane: number): FlowRoute {
  const sourceCenter = source.x + source.width / 2;
  const destinationCenter = destination.x + destination.width / 2;
  const startY = source.y + source.height / 2 + sourceOffset;
  const endY = destination.y + destination.height / 2 + destinationOffset;
  const startX = source.x + source.width;
  const endX = destination.x;
  if (sourceCenter > destinationCenter) {
    const laneOffset = reverseLane * 18;
    const rightTurnX = startX + 52 + laneOffset;
    const leftTurnX = endX - 52 - laneOffset;
    const detourY = Math.min(source.y, destination.y) - 52 - laneOffset;
    return { path: `M ${startX} ${startY} H ${rightTurnX} V ${detourY} H ${leftTurnX} V ${endY} H ${endX}`, labelX: (rightTurnX + leftTurnX) / 2, labelY: detourY, startX, startY, endX, endY };
  }
  if (Math.abs(startY - endY) <= 5) {
    return { path: `M ${startX} ${startY} H ${endX}`, labelX: (startX + endX) / 2, labelY: (startY + endY) / 2, startX, startY, endX, endY };
  }
  const midX = startX + Math.max(28, (endX - startX) / 2);
  return { path: `M ${startX} ${startY} H ${midX} V ${endY} H ${endX}`, labelX: midX, labelY: (startY + endY) / 2, startX, startY, endX, endY };
}

function roughSeed(value: string) {
  let seed = 2166136261;
  for (let index = 0; index < value.length; index += 1) seed = Math.imul(seed ^ value.charCodeAt(index), 16777619);
  return (seed >>> 0) || 1;
}

function RoughFlow({ route, selected, bidirectional, seed }: { route: FlowRoute; selected: boolean; bidirectional: boolean; seed: number }) {
  const ref = useRef<SVGSVGElement | null>(null);
  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    svg.replaceChildren();
    const rc = rough.svg(svg);
    const options = { roughness: 1, bowing: 1, seed, stroke: selected ? "#2563eb" : "#334155", strokeWidth: selected ? 3 : 2 };
    svg.appendChild(rc.path(route.path, options));
    svg.appendChild(rc.path(`M ${route.endX - 10} ${route.endY - 6} L ${route.endX} ${route.endY} L ${route.endX - 10} ${route.endY + 6}`, options));
    if (bidirectional) svg.appendChild(rc.path(`M ${route.startX + 10} ${route.startY - 6} L ${route.startX} ${route.startY} L ${route.startX + 10} ${route.startY + 6}`, options));
  }, [bidirectional, route.endX, route.endY, route.path, route.startX, route.startY, seed, selected]);
  return <svg ref={ref} className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden="true" />;
}

export const DfdFlowLayer = memo(function DfdFlowLayer({ flows, nodes, groups, selectedFlowId, onSelect }: Props) {
  const incidents = useMemo(() => {
    const result = new Map<string, string[]>();
    for (const flow of flows) {
      result.set(flow.sourceId, [...(result.get(flow.sourceId) ?? []), flow.id]);
      result.set(flow.destinationId, [...(result.get(flow.destinationId) ?? []), flow.id]);
    }
    return result;
  }, [flows]);
  const reverseLanes = useMemo(() => {
    const result = new Map<string, number>(); let lane = 0;
    for (const flow of flows) { const source = endpointBounds(flow.sourceId, nodes, groups); const destination = endpointBounds(flow.destinationId, nodes, groups); if (source && destination && source.x + source.width / 2 > destination.x + destination.width / 2) result.set(flow.id, lane++); }
    return result;
  }, [flows, groups, nodes]);
  return <>{flows.map((flow) => {
    const source = endpointBounds(flow.sourceId, nodes, groups); const destination = endpointBounds(flow.destinationId, nodes, groups);
    if (!source || !destination) return null;
    const sourceIncident = incidents.get(flow.sourceId) ?? []; const destinationIncident = incidents.get(flow.destinationId) ?? [];
    const route = buildFlowRoute(source, destination, (sourceIncident.indexOf(flow.id) - (sourceIncident.length - 1) / 2) * 11, (destinationIncident.indexOf(flow.id) - (destinationIncident.length - 1) / 2) * 11, reverseLanes.get(flow.id) ?? 0);
    const sourceCrud = modelEndpointCrud(flow, flow.sourceId, nodes, groups).join("");
    const destinationCrud = modelEndpointCrud(flow, flow.destinationId, nodes, groups).join("");
    return <div key={flow.id} data-dfd-flow={flow.id} className="pointer-events-none absolute inset-0">
      <RoughFlow route={route} selected={flow.id === selectedFlowId} bidirectional={Boolean(flow.bidirectional)} seed={roughSeed(flow.id)} />
      <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"><path className="pointer-events-auto cursor-pointer" d={route.path} fill="none" stroke="transparent" strokeWidth={16} onClick={() => onSelect(flow.id)} />
        {(flow.label || flow.protocol) && <g><text x={route.labelX} y={route.labelY - (flow.protocol ? 3 : 0)} textAnchor="middle" fontSize={11} fontWeight={600} fill="#0f172a" stroke="white" strokeWidth={4} paintOrder="stroke">{flow.label || "Data"}</text>{flow.protocol && <text x={route.labelX} y={route.labelY + 9} textAnchor="middle" fontSize={9} fill="#64748b" stroke="white" strokeWidth={3} paintOrder="stroke">{flow.protocol}</text>}</g>}
        {sourceCrud && <text x={route.startX + 12} y={route.startY - 7} textAnchor="middle" fontSize={10} fontWeight={700} fill="#334155" stroke="white" strokeWidth={4} paintOrder="stroke">{sourceCrud}</text>}
        {destinationCrud && <text x={route.endX - 14} y={route.endY - 7} textAnchor="middle" fontSize={10} fontWeight={700} fill="#334155" stroke="white" strokeWidth={4} paintOrder="stroke">{destinationCrud}</text>}
      </svg>
    </div>;
  })}</>;
});
