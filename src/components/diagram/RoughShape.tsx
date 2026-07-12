import rough from "roughjs/bundled/rough.esm";
import { useEffect, useRef } from "react";

type RoughShapeProps = {
  width: number;
  height: number;
  roughness: number;
  fill: string;
  stroke: string;
  selected?: boolean;
  subtle?: boolean;
};

export function RoughShape({ width, height, roughness, fill, stroke, selected, subtle = false }: RoughShapeProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    svg.replaceChildren();
    const rc = rough.svg(svg);
    const shape = rc.rectangle(4, 4, width - 8, height - 8, {
      roughness,
      bowing: 1.6,
      stroke: selected ? "#0f172a" : stroke,
      strokeWidth: selected ? 2.8 : subtle ? 1.25 : 2,
      fill,
      fillStyle: roughness <= 1.25 ? "solid" : "hachure",
      hachureGap: Math.max(3, 10 - roughness),
      hachureAngle: -41
    });
    svg.appendChild(shape);
  }, [fill, height, roughness, selected, stroke, subtle, width]);

  return <svg ref={svgRef} className="pointer-events-none absolute inset-0 h-full w-full" width={width} height={height} aria-hidden="true" />;
}
