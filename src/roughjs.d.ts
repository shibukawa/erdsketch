declare module "roughjs/bundled/rough.esm" {
  type RoughOptions = {
    roughness?: number;
    bowing?: number;
    stroke?: string;
    strokeWidth?: number;
    fill?: string;
    fillStyle?: string;
    hachureGap?: number;
    hachureAngle?: number;
  };

  type RoughSVG = {
    rectangle: (x: number, y: number, width: number, height: number, options?: RoughOptions) => SVGElement;
    path: (path: string, options?: RoughOptions) => SVGElement;
  };

  const rough: {
    svg: (svg: SVGSVGElement) => RoughSVG;
  };

  export default rough;
}
