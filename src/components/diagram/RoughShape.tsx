import rough from "roughjs/bundled/rough.esm";
import { useEffect, useRef } from "react";

type RoughShapeProps = {
  width: number;
  height: number;
  roughness: number;
  fill: string;
  stroke: string;
  selected?: boolean;
};

export function RoughShape({ width, height, roughness, fill, stroke, selected }: RoughShapeProps) {
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
      strokeWidth: selected ? 2.8 : 2,
      fill,
      fillStyle: "solid"
    });
    svg.appendChild(shape);
  }, [fill, height, roughness, selected, stroke, width]);

  return <svg ref={svgRef} className="pointer-events-none absolute inset-0 h-full w-full" width={width} height={height} aria-hidden="true" />;
}
