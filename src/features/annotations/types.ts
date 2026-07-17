export type CanvasType = "erd" | "dfd";
export type AnnotationKind = "sticky_note" | "arrow" | "freehand_stroke" | "background_boundary";
export type AnnotationLayer = "background" | "annotation" | "foreground";
export type AnnotationTool = "select" | "sticky_note" | "arrow" | "pen" | "boundary";

export type CanvasPoint = { x: number; y: number };
export type AnnotationStroke = { points: CanvasPoint[] };

export type AnnotationAnchor = CanvasPoint & {
  itemId?: string;
  itemKind?: "model" | "dfd_node" | "dfd_group";
};

export type CanvasAnnotation = {
  id: string;
  timestamp?: string;
  canvasType: CanvasType;
  canvasId: string;
  kind: AnnotationKind;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  points?: CanvasPoint[];
  strokes?: AnnotationStroke[];
  start?: AnnotationAnchor;
  end?: AnnotationAnchor;
  text?: string;
  color: string;
  fill?: string;
  strokeWidth: number;
  layer: AnnotationLayer;
  zIndex?: number;
  createdBy?: string;
  updatedBy?: string;
};

export type SaveAnnotation = (
  annotation: CanvasAnnotation,
  options?: { create?: boolean; delete?: boolean }
) => Promise<boolean>;
