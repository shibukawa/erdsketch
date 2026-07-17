import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { Collaborator } from "../../collaboration";
import { annotationStrokes, primaryAnnotationPoints, screenToleranceToWorld, simplifyPointSequence } from "./geometry";
import type { AnnotationAnchor, AnnotationTool, CanvasAnnotation, CanvasPoint, CanvasType, SaveAnnotation } from "./types";

type HistoryEntry = { before?: CanvasAnnotation; after?: CanvasAnnotation };
type GeometryEditState = {
  before: CanvasAnnotation;
  current?: CanvasAnnotation;
  selectedStrokeIndex?: number;
  selectedPointIndex?: number;
};
type Gesture =
  | { type: "draw"; pointerId: number; annotation: CanvasAnnotation; strokeIndex?: number }
  | { type: "move" | "resize"; pointerId: number; origin: CanvasPoint; before: CanvasAnnotation; current: CanvasAnnotation }
  | { type: "endpoint"; pointerId: number; endpoint: "start" | "end"; before: CanvasAnnotation; current: CanvasAnnotation }
  | { type: "node"; pointerId: number; strokeIndex?: number; pointIndex: number; before: CanvasAnnotation; current: CanvasAnnotation }
  | null;

type UseCanvasAnnotationsOptions = {
  canvasType: CanvasType;
  canvasId: string;
  annotations: CanvasAnnotation[];
  me: Collaborator;
  screenToWorld: (clientX: number, clientY: number) => CanvasPoint;
  findAnchor: (point: CanvasPoint) => AnnotationAnchor | undefined;
  saveAnnotation: SaveAnnotation;
  setLocalAnnotations: (next: CanvasAnnotation[] | ((current: CanvasAnnotation[]) => CanvasAnnotation[])) => void;
  updatePresence: (selectionId?: string, editingAnnotationId?: string) => Promise<boolean>;
};

const notePalette = [
  { color: "#92400e", fill: "#fef3c7" },
  { color: "#1e3a8a", fill: "#dbeafe" },
  { color: "#14532d", fill: "#dcfce7" },
  { color: "#831843", fill: "#fce7f3" },
  { color: "#312e81", fill: "#ede9fe" }
];

function translateAnnotation(annotation: CanvasAnnotation, dx: number, dy: number): CanvasAnnotation {
  const translatePoint = (point: CanvasPoint) => ({ ...point, x: point.x + dx, y: point.y + dy });
  return {
    ...annotation,
    x: annotation.x === undefined ? undefined : annotation.x + dx,
    y: annotation.y === undefined ? undefined : annotation.y + dy,
    points: annotation.points?.map(translatePoint),
    strokes: annotation.strokes?.map((stroke) => ({ ...stroke, points: stroke.points.map(translatePoint) })),
    start: annotation.start ? translatePoint(annotation.start) : undefined,
    end: annotation.end ? translatePoint(annotation.end) : undefined
  };
}

function replaceAnnotation(current: CanvasAnnotation[], annotation?: CanvasAnnotation, removedId?: string) {
  if (!annotation) return current.filter((item) => item.id !== removedId);
  const exists = current.some((item) => item.id === annotation.id);
  return exists ? current.map((item) => item.id === annotation.id ? annotation : item) : [...current, annotation];
}

function defaultAnnotation(tool: AnnotationTool, canvasType: CanvasType, canvasId: string, point: CanvasPoint): CanvasAnnotation {
  const base = {
    id: crypto.randomUUID(), canvasType, canvasId, x: point.x, y: point.y,
    color: "#334155", fill: "transparent", strokeWidth: 3, text: "", createdBy: "", updatedBy: ""
  };
  if (tool === "sticky_note") return { ...base, kind: "sticky_note", width: 220, height: 140, color: notePalette[0].color, fill: notePalette[0].fill, strokeWidth: 2, layer: "foreground" };
  if (tool === "arrow") return { ...base, kind: "arrow", start: point, end: point, layer: "annotation" };
  if (tool === "boundary") return { ...base, kind: "background_boundary", points: [point], color: "#2563eb", fill: "#dbeafe55", strokeWidth: 4, layer: "background" };
  return { ...base, kind: "freehand_stroke", strokes: [], layer: "annotation" };
}

function changed(before: CanvasAnnotation, after?: CanvasAnnotation) {
  return !after || JSON.stringify(before) !== JSON.stringify(after);
}

export function useCanvasAnnotations({ canvasType, canvasId, annotations, me, screenToWorld, findAnchor, saveAnnotation, setLocalAnnotations, updatePresence }: UseCanvasAnnotationsOptions) {
  const [activeTool, setActiveTool] = useState<AnnotationTool>("select");
  const [selectedId, setSelectedId] = useState("");
  const [visible, setVisible] = useState(true);
  const [draft, setDraft] = useState<CanvasAnnotation | null>(null);
  const [gesture, setGesture] = useState<Gesture>(null);
  const [geometryEdit, setGeometryEdit] = useState<GeometryEditState | null>(null);
  const historyRef = useRef<HistoryEntry[]>([]);
  const redoRef = useRef<HistoryEntry[]>([]);
  const textEditingBeforeRef = useRef<CanvasAnnotation | null>(null);

  const canvasAnnotations = useMemo(() => annotations.filter((annotation) => annotation.canvasType === canvasType && annotation.canvasId === canvasId), [annotations, canvasId, canvasType]);
  const selected = useMemo(() => canvasAnnotations.find((annotation) => annotation.id === selectedId), [canvasAnnotations, selectedId]);
  const previewAnnotation = geometryEdit ? geometryEdit.current : draft;
  const previewAnnotationId = geometryEdit?.before.id ?? draft?.id;

  const updateLocal = useCallback((annotation?: CanvasAnnotation, removedId?: string) => {
    setLocalAnnotations((current) => replaceAnnotation(current, annotation, removedId));
  }, [setLocalAnnotations]);

  const recordAndSave = useCallback(async (before: CanvasAnnotation | undefined, after: CanvasAnnotation | undefined) => {
    if (!before && !after) return false;
    updateLocal(after, before?.id);
    const saved = after
      ? await saveAnnotation(after, { create: !before })
      : await saveAnnotation(before!, { delete: true });
    if (!saved) {
      updateLocal(before, after?.id);
      window.alert("The annotation change could not be synchronized.");
      return false;
    }
    historyRef.current.push({ before, after });
    redoRef.current = [];
    return true;
  }, [saveAnnotation, updateLocal]);

  const cancelGeometryEdit = useCallback(() => {
    if (!geometryEdit) return;
    setGeometryEdit(null);
    setGesture(null);
    void updatePresence(geometryEdit.before.id, "");
  }, [geometryEdit, updatePresence]);

  const selectAnnotation = useCallback((id: string) => {
    if (geometryEdit && geometryEdit.before.id !== id) setGeometryEdit(null);
    setSelectedId(id);
    void updatePresence(id, "");
  }, [geometryEdit, updatePresence]);

  const selectTool = useCallback((tool: AnnotationTool) => {
    if (tool !== activeTool || tool === "select") {
      setDraft(null);
      setGesture(null);
    }
    if (geometryEdit) setGeometryEdit(null);
    setActiveTool(tool);
    if (tool !== "select") setSelectedId("");
    void updatePresence(tool === "select" ? selectedId : "", "");
  }, [activeTool, geometryEdit, selectedId, updatePresence]);

  const handleCanvasPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (activeTool === "select") return false;
    if ((event.target as HTMLElement).closest("[data-annotation-control='true']")) return false;
    event.preventDefault();
    event.stopPropagation();
    const point = screenToWorld(event.clientX, event.clientY);
    let annotation = activeTool === "pen" && draft?.kind === "freehand_stroke"
      ? draft
      : defaultAnnotation(activeTool, canvasType, canvasId, point);
    if (annotation.zIndex === undefined) annotation = {
      ...annotation,
      zIndex: Math.max(0, ...canvasAnnotations.filter((item) => item.layer === annotation.layer).map((item) => item.zIndex ?? 0)) + 1,
      createdBy: me.id,
      updatedBy: me.id
    };
    if (annotation.kind === "sticky_note") {
      setActiveTool("select");
      setSelectedId(annotation.id);
      void updatePresence(annotation.id, annotation.id);
      textEditingBeforeRef.current = annotation;
      updateLocal(annotation);
      void saveAnnotation(annotation, { create: true }).then((saved) => {
        if (saved) historyRef.current.push({ after: annotation });
        else updateLocal(undefined, annotation.id);
      });
      return true;
    }
    if (annotation.kind === "arrow") annotation = { ...annotation, start: findAnchor(point) ?? point };
    let strokeIndex: number | undefined;
    if (annotation.kind === "freehand_stroke") {
      const strokes = annotationStrokes(annotation);
      strokeIndex = strokes.length;
      annotation = { ...annotation, points: undefined, strokes: [...strokes.map((points) => ({ points })), { points: [point] }] };
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    setGesture({ type: "draw", pointerId: event.pointerId, annotation, strokeIndex });
    setDraft(annotation);
    return true;
  }, [activeTool, canvasAnnotations, canvasId, canvasType, draft, findAnchor, me.id, saveAnnotation, screenToWorld, updateLocal, updatePresence]);

  const handleAnnotationPointerDown = useCallback((event: ReactPointerEvent<HTMLElement | SVGElement>, annotation: CanvasAnnotation, mode: "move" | "resize" = "move") => {
    if (activeTool !== "select" || geometryEdit) return;
    event.preventDefault();
    event.stopPropagation();
    const point = screenToWorld(event.clientX, event.clientY);
    selectAnnotation(annotation.id);
    event.currentTarget.setPointerCapture(event.pointerId);
    setGesture({ type: mode, pointerId: event.pointerId, origin: point, before: annotation, current: annotation });
  }, [activeTool, geometryEdit, screenToWorld, selectAnnotation]);

  const handleArrowEndpointPointerDown = useCallback((event: ReactPointerEvent<SVGCircleElement>, annotation: CanvasAnnotation, endpoint: "start" | "end") => {
    if (activeTool !== "select" || geometryEdit || annotation.kind !== "arrow") return;
    event.preventDefault();
    event.stopPropagation();
    selectAnnotation(annotation.id);
    event.currentTarget.setPointerCapture(event.pointerId);
    setGesture({ type: "endpoint", pointerId: event.pointerId, endpoint, before: annotation, current: annotation });
  }, [activeTool, geometryEdit, selectAnnotation]);

  const selectGeometryStroke = useCallback((event: ReactPointerEvent<SVGPathElement>, annotation: CanvasAnnotation, strokeIndex: number) => {
    if (geometryEdit?.before.id !== annotation.id) return;
    event.preventDefault();
    event.stopPropagation();
    setGeometryEdit((current) => current ? { ...current, selectedStrokeIndex: strokeIndex, selectedPointIndex: undefined } : current);
  }, [geometryEdit]);

  const handleGeometryNodePointerDown = useCallback((event: ReactPointerEvent<SVGCircleElement>, annotation: CanvasAnnotation, pointIndex: number, strokeIndex?: number) => {
    if (geometryEdit?.before.id !== annotation.id) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setGeometryEdit((current) => current ? { ...current, selectedStrokeIndex: strokeIndex, selectedPointIndex: pointIndex } : current);
    setGesture({ type: "node", pointerId: event.pointerId, strokeIndex, pointIndex, before: annotation, current: annotation });
  }, [geometryEdit]);

  const handleCanvasPointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!gesture || gesture.pointerId !== event.pointerId) return false;
    const point = screenToWorld(event.clientX, event.clientY);
    if (gesture.type === "draw") {
      let next: CanvasAnnotation;
      if (gesture.annotation.kind === "arrow") next = { ...gesture.annotation, end: findAnchor(point) ?? point };
      else if (gesture.annotation.kind === "freehand_stroke" && gesture.strokeIndex !== undefined) {
        const strokes = annotationStrokes(gesture.annotation).map((stroke, index) => index === gesture.strokeIndex ? [...stroke, point] : stroke);
        next = { ...gesture.annotation, strokes: strokes.map((points) => ({ points })) };
      } else next = { ...gesture.annotation, points: [...(gesture.annotation.points ?? []), point] };
      setGesture({ ...gesture, annotation: next });
      setDraft(next);
      return true;
    }
    if (gesture.type === "endpoint") {
      const next = { ...gesture.current, [gesture.endpoint]: findAnchor(point) ?? point };
      setGesture({ ...gesture, current: next });
      setDraft(next);
      return true;
    }
    if (gesture.type === "node") {
      let next = gesture.current;
      if (next.kind === "freehand_stroke" && gesture.strokeIndex !== undefined) {
        const strokes = annotationStrokes(next).map((stroke, strokeIndex) => strokeIndex === gesture.strokeIndex
          ? stroke.map((value, pointIndex) => pointIndex === gesture.pointIndex ? point : value)
          : stroke);
        next = { ...next, points: undefined, strokes: strokes.map((points) => ({ points })) };
      } else if (next.kind === "background_boundary") {
        next = { ...next, points: (next.points ?? []).map((value, index) => index === gesture.pointIndex ? point : value) };
      }
      setGesture({ ...gesture, current: next });
      setGeometryEdit((current) => current ? { ...current, current: next } : current);
      return true;
    }
    const dx = point.x - gesture.origin.x;
    const dy = point.y - gesture.origin.y;
    const next = gesture.type === "resize"
      ? { ...gesture.before, width: Math.max(140, (gesture.before.width ?? 220) + dx), height: Math.max(90, (gesture.before.height ?? 140) + dy) }
      : translateAnnotation(gesture.before, dx, dy);
    setGesture({ ...gesture, current: next });
    setDraft(next);
    return true;
  }, [findAnchor, gesture, screenToWorld]);

  const handleCanvasPointerUp = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!gesture || gesture.pointerId !== event.pointerId) return false;
    const cancelled = event.type === "pointercancel";
    if (gesture.type === "draw") {
      const annotation = gesture.annotation;
      if (annotation.kind === "freehand_stroke" && gesture.strokeIndex !== undefined) {
        const strokes = annotationStrokes(annotation);
        const currentStroke = strokes[gesture.strokeIndex] ?? [];
        const simplified = cancelled ? [] : simplifyPointSequence(currentStroke, screenToleranceToWorld(screenToWorld), 2);
        const nextStrokes = strokes.flatMap((stroke, index) => index === gesture.strokeIndex ? (simplified.length >= 2 ? [simplified] : []) : [stroke]);
        setDraft(nextStrokes.length ? { ...annotation, strokes: nextStrokes.map((points) => ({ points })) } : null);
      } else if (!cancelled && annotation.kind === "arrow") {
        const valid = !!annotation.start && !!annotation.end && (annotation.start.itemId !== annotation.end.itemId || Math.hypot(annotation.end.x - annotation.start.x, annotation.end.y - annotation.start.y) > 8);
        if (valid) {
          setSelectedId(annotation.id);
          setActiveTool("select");
          void updatePresence(annotation.id, "");
          void recordAndSave(undefined, annotation);
        }
        setDraft(null);
      } else if (!cancelled && annotation.kind === "background_boundary") {
        const points = simplifyPointSequence(annotation.points ?? [], screenToleranceToWorld(screenToWorld), 3);
        if (points.length >= 3) {
          const next = { ...annotation, points };
          setSelectedId(annotation.id);
          setActiveTool("select");
          void updatePresence(annotation.id, "");
          void recordAndSave(undefined, next);
        }
        setDraft(null);
      } else setDraft(null);
    } else if (gesture.type === "node") {
      if (cancelled) setGeometryEdit((current) => current ? { ...current, current: gesture.before } : current);
    } else {
      const after = gesture.current;
      if (!cancelled && changed(gesture.before, after)) void recordAndSave(gesture.before, after);
      setDraft(null);
    }
    setGesture(null);
    return true;
  }, [gesture, recordAndSave, screenToWorld, updatePresence]);

  const finishPenAnnotation = useCallback(() => {
    if (draft?.kind !== "freehand_stroke" || annotationStrokes(draft).length === 0 || gesture) return;
    const annotation = draft;
    setDraft(null);
    setActiveTool("select");
    setSelectedId(annotation.id);
    void updatePresence(annotation.id, "");
    void recordAndSave(undefined, annotation);
  }, [draft, gesture, recordAndSave, updatePresence]);

  const beginTextEdit = useCallback((annotation: CanvasAnnotation) => {
    textEditingBeforeRef.current = annotation;
    setSelectedId(annotation.id);
    void updatePresence(annotation.id, annotation.id);
  }, [updatePresence]);

  const finishTextEdit = useCallback((annotation: CanvasAnnotation) => {
    const before = textEditingBeforeRef.current;
    textEditingBeforeRef.current = null;
    void updatePresence(annotation.id, "");
    if (before && changed(before, annotation)) void recordAndSave(before, annotation);
  }, [recordAndSave, updatePresence]);

  const beginGeometryEdit = useCallback(() => {
    if (!selected || (selected.kind !== "freehand_stroke" && selected.kind !== "background_boundary")) return;
    const current = selected.kind === "freehand_stroke"
      ? { ...selected, points: undefined, strokes: annotationStrokes(selected).map((points) => ({ points: [...points] })) }
      : { ...selected, points: [...(selected.points ?? [])] };
    setGeometryEdit({ before: selected, current });
    setDraft(null);
    setGesture(null);
    void updatePresence(selected.id, selected.id);
  }, [selected, updatePresence]);

  const deleteGeometryPart = useCallback(() => {
    if (!geometryEdit?.current) return;
    if (geometryEdit.current.kind === "freehand_stroke" && geometryEdit.selectedStrokeIndex !== undefined) {
      const strokes = annotationStrokes(geometryEdit.current).filter((_, index) => index !== geometryEdit.selectedStrokeIndex);
      setGeometryEdit({ ...geometryEdit, current: strokes.length ? { ...geometryEdit.current, strokes: strokes.map((points) => ({ points })) } : undefined, selectedStrokeIndex: undefined, selectedPointIndex: undefined });
      return;
    }
    if (geometryEdit.current.kind === "background_boundary" && geometryEdit.selectedPointIndex !== undefined && (geometryEdit.current.points?.length ?? 0) > 3) {
      setGeometryEdit({ ...geometryEdit, current: { ...geometryEdit.current, points: (geometryEdit.current.points ?? []).filter((_, index) => index !== geometryEdit.selectedPointIndex) }, selectedPointIndex: undefined });
    }
  }, [geometryEdit]);

  const confirmGeometryEdit = useCallback(() => {
    if (!geometryEdit) return;
    const { before, current } = geometryEdit;
    setGeometryEdit(null);
    setGesture(null);
    if (!current) setSelectedId("");
    void updatePresence(current?.id ?? "", "");
    if (changed(before, current)) void recordAndSave(before, current);
  }, [geometryEdit, recordAndSave, updatePresence]);

  const canDeleteGeometryPart = !!geometryEdit?.current && (
    (geometryEdit.current.kind === "freehand_stroke" && geometryEdit.selectedStrokeIndex !== undefined)
    || (geometryEdit.current.kind === "background_boundary" && geometryEdit.selectedPointIndex !== undefined && (geometryEdit.current.points?.length ?? 0) > 3)
  );

  const deleteSelected = useCallback(() => {
    if (!selected) return;
    setSelectedId("");
    setGeometryEdit(null);
    void updatePresence("", "");
    void recordAndSave(selected, undefined);
  }, [recordAndSave, selected, updatePresence]);

  const clearSelection = useCallback(() => {
    setSelectedId("");
    setGeometryEdit(null);
    void updatePresence("", "");
  }, [updatePresence]);

  useEffect(() => {
    setSelectedId("");
    setActiveTool("select");
    setDraft(null);
    setGesture(null);
    setGeometryEdit(null);
    void updatePresence("", "");
  }, [canvasId, canvasType, updatePresence]);

  useEffect(() => () => { void updatePresence("", ""); }, [updatePresence]);

  const detachItem = useCallback((itemId: string, resolveAnchor: (anchor: AnnotationAnchor) => CanvasPoint) => {
    for (const annotation of canvasAnnotations) {
      if (annotation.kind !== "arrow") continue;
      let changedAnchor = false;
      let start = annotation.start;
      let end = annotation.end;
      if (start?.itemId === itemId) { start = resolveAnchor(start); changedAnchor = true; }
      if (end?.itemId === itemId) { end = resolveAnchor(end); changedAnchor = true; }
      if (changedAnchor) void recordAndSave(annotation, { ...annotation, start, end, updatedBy: me.id });
    }
  }, [canvasAnnotations, me.id, recordAndSave]);

  const duplicateSelected = useCallback(() => {
    if (!selected) return;
    const copy = translateAnnotation({ ...selected, id: crypto.randomUUID(), zIndex: (selected.zIndex ?? 0) + 1, createdBy: me.id, updatedBy: me.id }, 28, 28);
    setSelectedId(copy.id);
    void recordAndSave(undefined, copy);
  }, [me.id, recordAndSave, selected]);

  const changeSelectedColor = useCallback((color: string, fill: string) => {
    if (!selected) return;
    void recordAndSave(selected, { ...selected, color, fill, updatedBy: me.id });
  }, [me.id, recordAndSave, selected]);

  const convertSelectedToBoundary = useCallback(() => {
    if (!selected || selected.kind !== "freehand_stroke") return;
    const points = primaryAnnotationPoints(selected);
    if (!points || points.length < 3) return;
    void recordAndSave(selected, { ...selected, kind: "background_boundary", points, strokes: undefined, layer: "background", color: "#2563eb", fill: "#dbeafe55", strokeWidth: Math.max(4, selected.strokeWidth), updatedBy: me.id });
  }, [me.id, recordAndSave, selected]);

  const canConvertSelectedToBoundary = !!selected && selected.kind === "freehand_stroke" && (primaryAnnotationPoints(selected)?.length ?? 0) >= 3;

  const moveSelectedInLayer = useCallback((direction: -1 | 1) => {
    if (!selected) return;
    const peers = canvasAnnotations.filter((annotation) => annotation.layer === selected.layer && annotation.id !== selected.id);
    const values = peers.map((annotation) => annotation.zIndex ?? 0);
    const zIndex = direction > 0 ? Math.max(selected.zIndex ?? 0, ...values) + 1 : Math.min(selected.zIndex ?? 0, ...values) - 1;
    void recordAndSave(selected, { ...selected, zIndex, updatedBy: me.id });
  }, [canvasAnnotations, me.id, recordAndSave, selected]);
  const moveSelectedForward = useCallback(() => moveSelectedInLayer(1), [moveSelectedInLayer]);
  const moveSelectedBackward = useCallback(() => moveSelectedInLayer(-1), [moveSelectedInLayer]);

  const undo = useCallback(() => {
    const entry = historyRef.current.pop();
    if (!entry) return;
    redoRef.current.push(entry);
    updateLocal(entry.before, entry.after?.id);
    if (entry.before) void saveAnnotation(entry.before, { create: !entry.after });
    else if (entry.after) void saveAnnotation(entry.after, { delete: true });
  }, [saveAnnotation, updateLocal]);

  const redo = useCallback(() => {
    const entry = redoRef.current.pop();
    if (!entry) return;
    historyRef.current.push(entry);
    updateLocal(entry.after, entry.before?.id);
    if (entry.after) void saveAnnotation(entry.after, { create: !entry.before });
    else if (entry.before) void saveAnnotation(entry.before, { delete: true });
  }, [saveAnnotation, updateLocal]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.key === "Escape") {
        if (geometryEdit) cancelGeometryEdit();
        else {
          setActiveTool("select");
          setDraft(null);
          setGesture(null);
        }
        return;
      }
      if ((event.key === "Delete" || event.key === "Backspace") && selectedId) {
        event.preventDefault();
        if (geometryEdit) deleteGeometryPart(); else deleteSelected();
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z" && selectedId && !geometryEdit) {
        event.preventDefault();
        if (event.shiftKey) redo(); else undo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cancelGeometryEdit, deleteGeometryPart, deleteSelected, geometryEdit, redo, selectedId, undo]);

  return {
    activeTool, selectTool, selectedId, selected, visible, setVisible, draft,
    previewAnnotation, previewAnnotationId,
    canvasAnnotations,
    handleCanvasPointerDown, handleCanvasPointerMove, handleCanvasPointerUp,
    handleAnnotationPointerDown, handleArrowEndpointPointerDown, handleGeometryNodePointerDown, selectGeometryStroke, selectAnnotation,
    beginTextEdit, finishTextEdit,
    beginGeometryEdit, confirmGeometryEdit, cancelGeometryEdit, deleteGeometryPart,
    geometryEditing: !!geometryEdit,
    selectedGeometryStrokeIndex: geometryEdit?.selectedStrokeIndex,
    selectedGeometryPointIndex: geometryEdit?.selectedPointIndex,
    canDeleteGeometryPart,
    finishPenAnnotation,
    hasPenDraft: draft?.kind === "freehand_stroke" && annotationStrokes(draft).length > 0,
    deleteSelected, duplicateSelected, changeSelectedColor, convertSelectedToBoundary, canConvertSelectedToBoundary, moveSelectedForward, moveSelectedBackward, clearSelection, detachItem, undo, redo,
    canUndo: historyRef.current.length > 0,
    canRedo: redoRef.current.length > 0,
    palette: notePalette
  };
}

export type CanvasAnnotationController = ReturnType<typeof useCanvasAnnotations>;
