import rough from "roughjs/bundled/rough.esm";
import { useEffect, useRef } from "react";

type RoughLinkProps = {
  path: string;
  roughness: number;
};

export function RoughLink({ path, roughness }: RoughLinkProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    svg.replaceChildren();
    const rc = rough.svg(svg);
    const shape = rc.path(path, {
      roughness,
      bowing: 1.8,
      stroke: "rgba(71,85,105,0.68)",
      strokeWidth: 2,
      fill: "none"
    });
    svg.appendChild(shape);
  }, [path, roughness]);

  return <svg ref={svgRef} className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden="true" />;
}
