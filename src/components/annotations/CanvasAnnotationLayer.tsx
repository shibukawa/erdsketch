import { useCallback, type ChangeEvent, type FocusEvent, type PointerEvent as ReactPointerEvent } from "react";
import type { Collaborator } from "../../collaboration";
import type { AnnotationAnchor, CanvasAnnotation, CanvasPoint } from "../../features/annotations/types";
import type { CanvasAnnotationController } from "../../features/annotations/useCanvasAnnotations";

type CanvasAnnotationLayerProps = {
  layer: "background" | "foreground";
  controller: CanvasAnnotationController;
  users: Collaborator[];
  me: Collaborator;
  resolveAnchor: (anchor: AnnotationAnchor) => CanvasPoint;
  width?: number;
  height?: number;
};

function pointsPath(points: CanvasPoint[], closed: boolean) {
  if (points.length === 0) return "";
  const body = points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x} ${point.y}`).join(" ");
  return closed ? `${body} Z` : body;
}

function selectionStroke(annotation: CanvasAnnotation, controller: CanvasAnnotationController, users: Collaborator[], me: Collaborator) {
  if (controller.selectedId === annotation.id) return "#2563eb";
  return users.find((user) => user.id !== me.id && user.selectionId === annotation.id)?.color;
}

function AnnotationPath({ annotation, controller, users, me, resolveAnchor }: Omit<CanvasAnnotationLayerProps, "layer" | "width" | "height"> & { annotation: CanvasAnnotation }) {
  const handlePointerDown = useCallback((event: ReactPointerEvent<SVGPathElement>) => controller.handleAnnotationPointerDown(event, annotation), [annotation, controller]);
  const selectedStroke = selectionStroke(annotation, controller, users, me);
  const arrowStart = annotation.start ? resolveAnchor(annotation.start) : { x: 0, y: 0 };
  const arrowEnd = annotation.end ? resolveAnchor(annotation.end) : { x: 0, y: 0 };
  const path = annotation.kind === "arrow" ? `M${arrowStart.x} ${arrowStart.y} L${arrowEnd.x} ${arrowEnd.y}` : pointsPath(annotation.points ?? [], annotation.kind === "background_boundary");
  return <g>
    {selectedStroke && <path d={path} fill="none" stroke={selectedStroke} strokeWidth={annotation.strokeWidth + 7} opacity={0.28} pointerEvents="none" />}
    <path
      d={path}
      fill={annotation.kind === "background_boundary" ? annotation.fill : "none"}
      stroke={annotation.color}
      strokeWidth={annotation.strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={annotation.kind === "background_boundary" ? "12 8" : undefined}
      markerEnd={annotation.kind === "arrow" ? `url(#annotation-arrow-${annotation.id})` : undefined}
      className="cursor-move"
      pointerEvents={annotation.kind === "background_boundary" ? "visiblePainted" : "stroke"}
      onPointerDown={handlePointerDown}
    />
    {annotation.kind === "arrow" && <defs><marker id={`annotation-arrow-${annotation.id}`} markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,6 L9,3 z" fill={annotation.color} /></marker></defs>}
  </g>;
}

function AnnotationLabel({ annotation, controller, users, me, resolveAnchor }: Omit<CanvasAnnotationLayerProps, "layer" | "width" | "height"> & { annotation: CanvasAnnotation }) {
  const remoteEditor = users.find((user) => user.id !== me.id && user.editingAnnotationId === annotation.id);
  const points = annotation.points ?? [];
  const start = annotation.start ? resolveAnchor(annotation.start) : undefined;
  const end = annotation.end ? resolveAnchor(annotation.end) : undefined;
  const position = annotation.kind === "arrow" && start && end
    ? { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 }
    : points.reduce((best, point) => point.y < best.y ? point : best, points[0] ?? { x: 0, y: 0 });
  const handleFocus = useCallback(() => { if (!remoteEditor) controller.beginTextEdit(annotation); }, [annotation, controller, remoteEditor]);
  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => controller.changeText(annotation, event.target.value), [annotation, controller]);
  const handleBlur = useCallback((event: FocusEvent<HTMLInputElement>) => controller.finishTextEdit({ ...annotation, text: event.target.value }), [annotation, controller]);
  const stopPointer = useCallback((event: ReactPointerEvent<HTMLInputElement>) => event.stopPropagation(), []);
  if (!annotation.text && controller.selectedId !== annotation.id) return null;
  return <div className="pointer-events-auto absolute z-20 -translate-x-1/2 -translate-y-1/2" style={{ left: position.x, top: position.y }} data-annotation-control="true">
    <input className="min-w-24 rounded-md border border-slate-200 bg-white/95 px-2 py-1 text-center text-xs font-semibold text-slate-700 shadow-sm outline-none focus:border-blue-500" value={annotation.text ?? ""} placeholder={annotation.kind === "arrow" ? "Arrow label" : "Subsystem label"} readOnly={!!remoteEditor} onFocus={handleFocus} onChange={handleChange} onBlur={handleBlur} onPointerDown={stopPointer} />
    {remoteEditor && <span className="absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded px-2 py-0.5 text-[10px] text-white" style={{ background: remoteEditor.color }}>{remoteEditor.name} editing</span>}
  </div>;
}

function StickyAnnotation({ annotation, controller, users, me }: Omit<CanvasAnnotationLayerProps, "layer" | "width" | "height" | "resolveAnchor"> & { annotation: CanvasAnnotation }) {
  const remoteEditor = users.find((user) => user.id !== me.id && user.editingAnnotationId === annotation.id);
  const remoteSelector = users.find((user) => user.id !== me.id && user.selectionId === annotation.id);
  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => controller.handleAnnotationPointerDown(event, annotation), [annotation, controller]);
  const handleResizePointerDown = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => controller.handleAnnotationPointerDown(event, annotation, "resize"), [annotation, controller]);
  const handleFocus = useCallback(() => { if (!remoteEditor) controller.beginTextEdit(annotation); }, [annotation, controller, remoteEditor]);
  const handleChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => controller.changeText(annotation, event.target.value), [annotation, controller]);
  const handleBlur = useCallback((event: FocusEvent<HTMLTextAreaElement>) => controller.finishTextEdit({ ...annotation, text: event.target.value }), [annotation, controller]);
  const stopPointer = useCallback((event: ReactPointerEvent<HTMLTextAreaElement>) => event.stopPropagation(), []);
  const selectionColor = controller.selectedId === annotation.id ? "#2563eb" : remoteSelector?.color;
  return <div className="pointer-events-auto absolute z-30 flex cursor-move flex-col rounded-sm shadow-lg" style={{ left: annotation.x, top: annotation.y, width: annotation.width, height: annotation.height, color: annotation.color, background: annotation.fill, outline: selectionColor ? `3px solid ${selectionColor}` : undefined, outlineOffset: 3, transform: "rotate(-0.5deg)" }} onPointerDown={handlePointerDown}>
    <div className="h-2.5 shrink-0 opacity-35" style={{ background: annotation.color }} />
    <textarea data-annotation-control="true" className="min-h-0 flex-1 resize-none bg-transparent p-4 text-sm font-medium leading-relaxed outline-none placeholder:text-current/50" value={annotation.text ?? ""} placeholder="Write a note…" readOnly={!!remoteEditor} autoFocus={controller.selectedId === annotation.id && !annotation.text} onFocus={handleFocus} onChange={handleChange} onBlur={handleBlur} onPointerDown={stopPointer} />
    {remoteEditor && <span className="absolute -top-7 left-0 rounded px-2 py-1 text-[10px] font-bold text-white" style={{ background: remoteEditor.color }}>{remoteEditor.name} editing</span>}
    {controller.selectedId === annotation.id && <button data-annotation-control="true" type="button" aria-label="Resize sticky note" className="absolute -bottom-2 -right-2 h-5 w-5 cursor-nwse-resize rounded-full border-2 border-white bg-blue-600 shadow" onPointerDown={handleResizePointerDown} />}
  </div>;
}

export function CanvasAnnotationLayer({ layer, controller, users, me, resolveAnchor, width = 3200, height = 2400 }: CanvasAnnotationLayerProps) {
  if (!controller.visible) return null;
  const draft = controller.draft;
  const persistent = controller.canvasAnnotations.filter((annotation) => layer === "background" ? annotation.layer === "background" : annotation.layer !== "background");
  const draftForLayer = draft && (layer === "background" ? draft.layer === "background" : draft.layer !== "background") ? [draft] : [];
  const annotations = [...persistent, ...draftForLayer].sort((left, right) => (left.zIndex ?? 0) - (right.zIndex ?? 0));
  const paths = annotations.filter((annotation) => annotation.kind !== "sticky_note");
  const stickies = annotations.filter((annotation) => annotation.kind === "sticky_note");
  return <div className={`pointer-events-none absolute inset-0 ${layer === "background" ? "z-0" : "z-30"}`}>
    <svg className="absolute inset-0 overflow-visible" width={width} height={height} aria-label={layer === "background" ? "Annotation boundaries" : "Canvas annotations"}>
      {paths.map((annotation) => <AnnotationPath key={`${draft === annotation ? "draft-" : ""}${annotation.id}`} annotation={annotation} controller={controller} users={users} me={me} resolveAnchor={resolveAnchor} />)}
    </svg>
    {layer === "foreground" && paths.filter((annotation) => annotation.kind === "arrow").map((annotation) => <AnnotationLabel key={`label-${annotation.id}`} annotation={annotation} controller={controller} users={users} me={me} resolveAnchor={resolveAnchor} />)}
    {layer === "background" && paths.map((annotation) => <AnnotationLabel key={`label-${annotation.id}`} annotation={annotation} controller={controller} users={users} me={me} resolveAnchor={resolveAnchor} />)}
    {stickies.map((annotation) => <StickyAnnotation key={annotation.id} annotation={annotation} controller={controller} users={users} me={me} />)}
  </div>;
}
