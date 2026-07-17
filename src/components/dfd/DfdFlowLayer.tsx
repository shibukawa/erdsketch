import rough from "roughjs/bundled/rough.esm";
import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import type { DfdFlow, DfdGroup, DfdNode } from "../../features/modeling/types";
import { modelEndpointCrud } from "../../features/dfd/dfd";
import { buildDfdFlowRoutes, type DfdFlowRoute } from "../../features/dfd/flowRouting";

type Props = { flows: DfdFlow[]; nodes: DfdNode[]; groups: DfdGroup[]; selectedFlowId?: string; onSelect: (flowId: string) => void };

function roughSeed(value: string) {
  let seed = 2166136261;
  for (let index = 0; index < value.length; index += 1) seed = Math.imul(seed ^ value.charCodeAt(index), 16777619);
  return (seed >>> 0) || 1;
}

function RoughFlow({ route, selected, bidirectional, seed }: { route: DfdFlowRoute; selected: boolean; bidirectional: boolean; seed: number }) {
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

type FlowItemProps = { flow: DfdFlow; route: DfdFlowRoute; selected: boolean; nodes: DfdNode[]; groups: DfdGroup[]; onSelect: (flowId: string) => void };

function FlowItem({ flow, route, selected, nodes, groups, onSelect }: FlowItemProps) {
  const sourceCrud = modelEndpointCrud(flow, flow.sourceId, nodes, groups).join("");
  const destinationCrud = modelEndpointCrud(flow, flow.destinationId, nodes, groups).join("");
  const handleSelect = useCallback(() => onSelect(flow.id), [flow.id, onSelect]);
  return <div data-dfd-flow={flow.id} className="pointer-events-none absolute inset-0">
    <RoughFlow route={route} selected={selected} bidirectional={Boolean(flow.bidirectional)} seed={roughSeed(flow.id)} />
    <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"><path className="pointer-events-auto cursor-pointer" d={route.path} fill="none" stroke="transparent" strokeWidth={16} onClick={handleSelect} />
      {(flow.label || flow.protocol) && <g><text x={route.labelX} y={route.labelY - (flow.protocol ? 3 : 0)} textAnchor="middle" fontSize={11} fontWeight={600} fill="#0f172a" stroke="white" strokeWidth={4} paintOrder="stroke">{flow.label || "Data"}</text>{flow.protocol && <text x={route.labelX} y={route.labelY + 9} textAnchor="middle" fontSize={9} fill="#64748b" stroke="white" strokeWidth={3} paintOrder="stroke">{flow.protocol}</text>}</g>}
      {sourceCrud && <text x={route.startX + 12} y={route.startY - 7} textAnchor="middle" fontSize={10} fontWeight={700} fill="#334155" stroke="white" strokeWidth={4} paintOrder="stroke">{sourceCrud}</text>}
      {destinationCrud && <text x={route.endX - 14} y={route.endY - 7} textAnchor="middle" fontSize={10} fontWeight={700} fill="#334155" stroke="white" strokeWidth={4} paintOrder="stroke">{destinationCrud}</text>}
    </svg>
  </div>;
}

export const DfdFlowLayer = memo(function DfdFlowLayer({ flows, nodes, groups, selectedFlowId, onSelect }: Props) {
  const routes = useMemo(() => buildDfdFlowRoutes(flows, nodes, groups), [flows, groups, nodes]);
  return <>{flows.map((flow) => {
    const route = routes.get(flow.id);
    return route ? <FlowItem key={flow.id} flow={flow} route={route} selected={flow.id === selectedFlowId} nodes={nodes} groups={groups} onSelect={onSelect} /> : null;
  })}</>;
});
