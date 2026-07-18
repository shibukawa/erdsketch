import { Pencil } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FocusEvent, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import type { Collaborator } from "../../collaboration";
import { annotationStrokes } from "../../features/annotations/geometry";
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

function RemoteEditingBadge({ editor, className }: { editor: Collaborator; className: string }) {
  return <span className={`pointer-events-none flex items-center gap-1 rounded px-2 py-1 text-[10px] font-bold text-white ${className}`} style={{ background: editor.color }}><Pencil className="cowork-pencil" size={11} /><span data-i18n-skip>{editor.name}</span> editing</span>;
}

function useAnnotationTextDraft(annotation: CanvasAnnotation, controller: CanvasAnnotationController, me: Collaborator, remoteEditor?: Collaborator) {
  const [text, setText] = useState(annotation.text ?? "");
  const editingRef = useRef(false);

  useEffect(() => {
    if (!editingRef.current) setText(annotation.text ?? "");
  }, [annotation.text]);

  const begin = useCallback(() => {
    if (remoteEditor) return;
    editingRef.current = true;
    setText(annotation.text ?? "");
    controller.beginTextEdit(annotation);
  }, [annotation, controller, remoteEditor]);

  const change = useCallback((value: string) => setText(value), []);

  const finish = useCallback((value: string) => {
    if (!editingRef.current) return;
    editingRef.current = false;
    setText(value);
    controller.finishTextEdit({ ...annotation, text: value, updatedBy: me.id });
  }, [annotation, controller, me.id]);

  const cancel = useCallback(() => {
    if (!editingRef.current) return;
    editingRef.current = false;
    setText(annotation.text ?? "");
    controller.finishTextEdit(annotation);
  }, [annotation, controller]);

  return { text, begin, change, finish, cancel };
}

function GeometryNode({ annotation, controller, point, pointIndex, strokeIndex }: { annotation: CanvasAnnotation; controller: CanvasAnnotationController; point: CanvasPoint; pointIndex: number; strokeIndex?: number }) {
  const selected = strokeIndex === undefined
    ? controller.selectedGeometryPointIndex === pointIndex
    : controller.selectedGeometryStrokeIndex === strokeIndex && controller.selectedGeometryPointIndex === pointIndex;
  const handlePointerDown = useCallback((event: ReactPointerEvent<SVGCircleElement>) => controller.handleGeometryNodePointerDown(event, annotation, pointIndex, strokeIndex), [annotation, controller, pointIndex, strokeIndex]);
  return <circle cx={point.x} cy={point.y} r={selected ? 6 : 4.5} fill={selected ? "#dc2626" : "white"} stroke={selected ? "white" : "#2563eb"} strokeWidth={2.5} className="cursor-move" pointerEvents="all" onPointerDown={handlePointerDown} />;
}

function FreehandStrokePath({ annotation, controller, stroke, strokeIndex, selectedStroke }: { annotation: CanvasAnnotation; controller: CanvasAnnotationController; stroke: CanvasPoint[]; strokeIndex: number; selectedStroke?: string }) {
  const path = pointsPath(stroke, false);
  const editing = controller.geometryEditing && controller.selectedId === annotation.id;
  const activeStroke = editing && controller.selectedGeometryStrokeIndex === strokeIndex;
  const handlePointerDown = useCallback((event: ReactPointerEvent<SVGPathElement>) => {
    if (editing) controller.selectGeometryStroke(event, annotation, strokeIndex);
    else controller.handleAnnotationPointerDown(event, annotation);
  }, [annotation, controller, editing, strokeIndex]);
  return <>
    {(selectedStroke || activeStroke) && <path d={path} fill="none" stroke={activeStroke ? "#dc2626" : selectedStroke} strokeWidth={annotation.strokeWidth + 7} opacity={activeStroke ? 0.38 : 0.28} pointerEvents="none" />}
    <path d={path} fill="none" stroke={annotation.color} strokeWidth={annotation.strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={editing ? "cursor-pointer" : "cursor-move"} pointerEvents="stroke" onPointerDown={handlePointerDown} />
    {editing && stroke.map((point, pointIndex) => <GeometryNode key={`${strokeIndex}-${pointIndex}`} annotation={annotation} controller={controller} point={point} pointIndex={pointIndex} strokeIndex={strokeIndex} />)}
  </>;
}

function AnnotationPath({ annotation, controller, users, me, resolveAnchor }: Omit<CanvasAnnotationLayerProps, "layer" | "width" | "height"> & { annotation: CanvasAnnotation }) {
  const handlePointerDown = useCallback((event: ReactPointerEvent<SVGPathElement>) => controller.handleAnnotationPointerDown(event, annotation), [annotation, controller]);
  const handleStartPointerDown = useCallback((event: ReactPointerEvent<SVGCircleElement>) => controller.handleArrowEndpointPointerDown(event, annotation, "start"), [annotation, controller]);
  const handleEndPointerDown = useCallback((event: ReactPointerEvent<SVGCircleElement>) => controller.handleArrowEndpointPointerDown(event, annotation, "end"), [annotation, controller]);
  const selectedStroke = selectionStroke(annotation, controller, users, me);
  const arrowStart = annotation.start ? resolveAnchor(annotation.start) : { x: 0, y: 0 };
  const arrowEnd = annotation.end ? resolveAnchor(annotation.end) : { x: 0, y: 0 };
  if (annotation.kind === "freehand_stroke") return <g>{annotationStrokes(annotation).map((stroke, index) => <FreehandStrokePath key={index} annotation={annotation} controller={controller} stroke={stroke} strokeIndex={index} selectedStroke={selectedStroke} />)}</g>;
  const path = annotation.kind === "arrow" ? `M${arrowStart.x} ${arrowStart.y} L${arrowEnd.x} ${arrowEnd.y}` : pointsPath(annotation.points ?? [], annotation.kind === "background_boundary");
  const editingBoundary = annotation.kind === "background_boundary" && controller.geometryEditing && controller.selectedId === annotation.id;
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
      className={editingBoundary ? "cursor-default" : "cursor-move"}
      pointerEvents={annotation.kind === "background_boundary" ? "visiblePainted" : "stroke"}
      onPointerDown={editingBoundary ? undefined : handlePointerDown}
    />
    {annotation.kind === "arrow" && <defs><marker id={`annotation-arrow-${annotation.id}`} markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,6 L9,3 z" fill={annotation.color} /></marker></defs>}
    {annotation.kind === "arrow" && controller.selectedId === annotation.id && <>
      <circle cx={arrowStart.x} cy={arrowStart.y} r={6} fill="white" stroke="#2563eb" strokeWidth={3} className="cursor-move" pointerEvents="all" onPointerDown={handleStartPointerDown} />
      <circle cx={arrowEnd.x} cy={arrowEnd.y} r={6} fill="white" stroke="#2563eb" strokeWidth={3} className="cursor-move" pointerEvents="all" onPointerDown={handleEndPointerDown} />
    </>}
    {editingBoundary && (annotation.points ?? []).map((point, pointIndex) => <GeometryNode key={pointIndex} annotation={annotation} controller={controller} point={point} pointIndex={pointIndex} />)}
  </g>;
}

function AnnotationLabel({ annotation, controller, users, me, resolveAnchor }: Omit<CanvasAnnotationLayerProps, "layer" | "width" | "height"> & { annotation: CanvasAnnotation }) {
  const remoteEditor = users.find((user) => user.id !== me.id && user.editingAnnotationId === annotation.id);
  const { text, begin, change, finish, cancel } = useAnnotationTextDraft(annotation, controller, me, remoteEditor);
  const points = annotation.points ?? [];
  const start = annotation.start ? resolveAnchor(annotation.start) : undefined;
  const end = annotation.end ? resolveAnchor(annotation.end) : undefined;
  const position = annotation.kind === "arrow" && start && end
    ? { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 }
    : points.reduce((best, point) => point.y < best.y ? point : best, points[0] ?? { x: 0, y: 0 });
  const handleFocus = useCallback(() => begin(), [begin]);
  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => change(event.target.value), [change]);
  const handleBlur = useCallback((event: FocusEvent<HTMLInputElement>) => finish(event.target.value), [finish]);
  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Escape") return;
    cancel();
    event.currentTarget.blur();
  }, [cancel]);
  const stopPointer = useCallback((event: ReactPointerEvent<HTMLInputElement>) => event.stopPropagation(), []);
  if (!annotation.text && controller.selectedId !== annotation.id) return null;
  return <div className="pointer-events-auto absolute z-20 -translate-x-1/2 -translate-y-1/2" style={{ left: position.x, top: position.y }} data-annotation-control="true">
    <input className="min-w-24 rounded-md border border-slate-200 bg-white/95 px-2 py-1 text-center text-xs font-semibold text-slate-700 shadow-sm outline-none focus:border-blue-500" value={text} placeholder={annotation.kind === "arrow" ? "Arrow label" : "Subsystem label"} readOnly={!!remoteEditor} onFocus={handleFocus} onChange={handleChange} onBlur={handleBlur} onKeyDown={handleKeyDown} onPointerDown={stopPointer} />
    {remoteEditor && <RemoteEditingBadge editor={remoteEditor} className="absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap" />}
  </div>;
}

function StickyAnnotation({ annotation, controller, users, me }: Omit<CanvasAnnotationLayerProps, "layer" | "width" | "height" | "resolveAnchor"> & { annotation: CanvasAnnotation }) {
  const remoteEditor = users.find((user) => user.id !== me.id && user.editingAnnotationId === annotation.id);
  const { text, begin, change, finish, cancel } = useAnnotationTextDraft(annotation, controller, me, remoteEditor);
  const remoteSelector = users.find((user) => user.id !== me.id && user.selectionId === annotation.id);
  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => controller.handleAnnotationPointerDown(event, annotation), [annotation, controller]);
  const handleResizePointerDown = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => controller.handleAnnotationPointerDown(event, annotation, "resize"), [annotation, controller]);
  const handleFocus = useCallback(() => begin(), [begin]);
  const handleChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => change(event.target.value), [change]);
  const handleBlur = useCallback((event: FocusEvent<HTMLTextAreaElement>) => finish(event.target.value), [finish]);
  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Escape") return;
    cancel();
    event.currentTarget.blur();
  }, [cancel]);
  const stopPointer = useCallback((event: ReactPointerEvent<HTMLTextAreaElement>) => event.stopPropagation(), []);
  const selectionColor = controller.selectedId === annotation.id ? "#2563eb" : remoteSelector?.color;
  return <div className="pointer-events-auto absolute z-30 flex cursor-move flex-col rounded-sm shadow-lg" style={{ left: annotation.x, top: annotation.y, width: annotation.width, height: annotation.height, color: annotation.color, background: annotation.fill, outline: selectionColor ? `3px solid ${selectionColor}` : undefined, outlineOffset: 3, transform: "rotate(-0.5deg)" }} onPointerDown={handlePointerDown}>
    <div className="h-2.5 shrink-0 opacity-35" style={{ background: annotation.color }} />
    <textarea data-annotation-control="true" className="min-h-0 flex-1 resize-none bg-transparent p-4 text-sm font-medium leading-relaxed outline-none placeholder:text-current/50" value={text} placeholder="Write a note…" readOnly={!!remoteEditor} autoFocus={controller.selectedId === annotation.id && !annotation.text} onFocus={handleFocus} onChange={handleChange} onBlur={handleBlur} onKeyDown={handleKeyDown} onPointerDown={stopPointer} />
    {remoteEditor && <RemoteEditingBadge editor={remoteEditor} className="absolute -top-7 left-0" />}
    {controller.selectedId === annotation.id && <button data-annotation-control="true" type="button" aria-label="Resize sticky note" className="absolute -bottom-2 -right-2 h-5 w-5 cursor-nwse-resize rounded-full border-2 border-white bg-blue-600 shadow" onPointerDown={handleResizePointerDown} />}
  </div>;
}

export function CanvasAnnotationLayer({ layer, controller, users, me, resolveAnchor, width = 3200, height = 2400 }: CanvasAnnotationLayerProps) {
  if (!controller.visible) return null;
  const draft = controller.previewAnnotation;
  const persistent = controller.canvasAnnotations.filter((annotation) => annotation.id !== controller.previewAnnotationId && (layer === "background" ? annotation.layer === "background" : annotation.layer !== "background"));
  const draftForLayer = draft && (layer === "background" ? draft.layer === "background" : draft.layer !== "background") ? [draft] : [];
  const annotations = [...persistent, ...draftForLayer].sort((left, right) => (left.zIndex ?? 0) - (right.zIndex ?? 0));
  const paths = annotations.filter((annotation) => annotation.kind !== "sticky_note");
  const stickies = annotations.filter((annotation) => annotation.kind === "sticky_note");
  return <div className={`pointer-events-none absolute inset-0 ${layer === "background" ? "z-0" : "z-30"}`}>
    <svg className="absolute inset-0 overflow-visible" width={width} height={height} aria-label={layer === "background" ? "Annotation boundaries" : "Canvas annotations"}>
      {paths.map((annotation) => <AnnotationPath key={`${draft === annotation ? "draft-" : ""}${annotation.id}`} annotation={annotation} controller={controller} users={users} me={me} resolveAnchor={resolveAnchor} />)}
    </svg>
    {layer === "foreground" && paths.filter((annotation) => annotation.kind === "arrow").map((annotation) => <AnnotationLabel key={`label-${annotation.id}`} annotation={annotation} controller={controller} users={users} me={me} resolveAnchor={resolveAnchor} />)}
    {layer === "background" && paths.filter((annotation) => !(controller.geometryEditing && controller.selectedId === annotation.id)).map((annotation) => <AnnotationLabel key={`label-${annotation.id}`} annotation={annotation} controller={controller} users={users} me={me} resolveAnchor={resolveAnchor} />)}
    {stickies.map((annotation) => <StickyAnnotation key={annotation.id} annotation={annotation} controller={controller} users={users} me={me} />)}
  </div>;
}
