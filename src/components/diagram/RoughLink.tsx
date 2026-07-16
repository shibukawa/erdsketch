import rough from "roughjs/bundled/rough.esm";
import { useEffect, useRef } from "react";

type RoughLinkProps = {
  path: string;
  roughness: number;
  arrowPath?: string;
  diamondPath?: string;
};

export function RoughLink({ path, roughness, arrowPath, diamondPath }: RoughLinkProps) {
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
    if (arrowPath) {
      svg.appendChild(rc.path(arrowPath, {
        roughness,
        bowing: 0.8,
        stroke: "rgba(71,85,105,0.82)",
        strokeWidth: 2.3,
        fill: "none"
      }));
    }
    if (diamondPath) {
      const diamond = document.createElementNS("http://www.w3.org/2000/svg", "path");
      diamond.setAttribute("d", diamondPath);
      diamond.setAttribute("fill", "#0f172a");
      diamond.setAttribute("stroke", "#0f172a");
      diamond.setAttribute("stroke-width", "1.5");
      svg.appendChild(diamond);
    }
  }, [arrowPath, diamondPath, path, roughness]);

  return <svg ref={svgRef} className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden="true" />;
}
