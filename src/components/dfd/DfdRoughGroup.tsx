import rough from "roughjs/bundled/rough.esm";
import { useEffect, useRef } from "react";

export function DfdRoughGroup({ width, height, selected }: { width: number; height: number; selected: boolean }) {
  const ref = useRef<SVGSVGElement | null>(null);
  useEffect(() => {
    const svg = ref.current; if (!svg) return; svg.replaceChildren();
    const shape = rough.svg(svg).rectangle(3, 3, width - 6, height - 6, { roughness: 1, bowing: 1, stroke: selected ? "#2563eb" : "#64748b", strokeWidth: 2, strokeLineDash: [8, 7] });
    svg.appendChild(shape);
  }, [height, selected, width]);
  return <svg ref={ref} className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden="true" />;
}
