import rough from "roughjs/bundled/rough.esm";
import { useEffect, useRef } from "react";
import type { DfdNode } from "../../features/modeling/types";

type Props = { node: DfdNode; width: number; height: number; roughness: number; selected: boolean };

export function DfdRoughShape({ node, width, height, roughness, selected }: Props) {
  const ref = useRef<SVGSVGElement | null>(null);
  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    svg.replaceChildren();
    const rc = rough.svg(svg);
    const stroke = selected ? "#2563eb" : node.kind === "intermediate" && node.intermediateKind === "queue" ? "#0e7490" : "#1e293b";
    const fill = node.kind === "model" ? "#fffbeb" : node.kind === "intermediate" && node.intermediateKind === "queue" ? "#ecfeff" : "#ffffff";
    const options = { roughness, bowing: 1.2, stroke, strokeWidth: selected ? 2.8 : 2, fill, fillStyle: "solid" };
    const lineOptions = { roughness, bowing: 1.2, stroke, strokeWidth: selected ? 2.5 : 1.8 };
    const append = (shape: SVGElement) => svg.appendChild(shape);
    if (node.kind === "process") {
      append(rc.rectangle(4, 4, width - 8, height - 8, options));
      append(rc.path(`M 18 5 V ${height - 5}`, lineOptions));
      append(rc.path(`M ${width - 18} 5 V ${height - 5}`, lineOptions));
      if (node.physicalProcesses?.length) append(rc.path(`M 19 42 H ${width - 19}`, lineOptions));
    } else if (node.kind === "model") {
      append(rc.path(`M 6 18 C 6 2 ${width - 6} 2 ${width - 6} 18 V ${height - 18} C ${width - 6} ${height + 2} 6 ${height + 2} 6 ${height - 18} Z`, options));
      append(rc.path(`M 6 18 C 6 36 ${width - 6} 36 ${width - 6} 18 C ${width - 6} 1 6 1 6 18`, lineOptions));
      append(rc.path(`M 6 ${height - 18} C 6 ${height} ${width - 6} ${height} ${width - 6} ${height - 18}`, lineOptions));
    } else if (node.kind === "external") {
      append(rc.path(`M 5 5 H ${width - 42} L ${width - 5} ${height / 2} L ${width - 42} ${height - 5} H 5 Z`, options));
    } else if (node.intermediateKind === "queue") {
      append(rc.path(`M 23 5 H ${width - 23} C ${width + 2} 5 ${width + 2} ${height - 5} ${width - 23} ${height - 5} H 23 C -2 ${height - 5} -2 5 23 5 Z`, options));
      append(rc.path(`M 23 5 C 43 5 43 ${height - 5} 23 ${height - 5} C 2 ${height - 5} 2 5 23 5`, lineOptions));
      append(rc.path(`M ${width - 23} 5 C ${width - 43} 5 ${width - 43} ${height - 5} ${width - 23} ${height - 5}`, lineOptions));
    } else {
      append(rc.path(`M 5 5 H ${width - 38} L ${width - 5} 38 V ${height - 5} H 5 Z`, options));
      append(rc.path(`M ${width - 38} 5 V 38 H ${width - 5}`, lineOptions));
    }
  }, [height, node, roughness, selected, width]);
  return <svg ref={ref} className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" width={width} height={height} aria-hidden="true" />;
}
