import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { Collaborator } from "../../collaboration";
import type { AnnotationAnchor, AnnotationTool, CanvasAnnotation, CanvasPoint, CanvasType, SaveAnnotation } from "./types";

type HistoryEntry = { before?: CanvasAnnotation; after?: CanvasAnnotation };
type Gesture =
  | { type: "draw"; pointerId: number; annotation: CanvasAnnotation }
  | { type: "move"; pointerId: number; annotationId: string; origin: CanvasPoint; before: CanvasAnnotation; current: CanvasAnnotation }
  | { type: "resize"; pointerId: number; annotationId: string; origin: CanvasPoint; before: CanvasAnnotation; current: CanvasAnnotation }
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
  return { ...base, kind: "freehand_stroke", points: [point], layer: "annotation" };
}

export function useCanvasAnnotations({ canvasType, canvasId, annotations, me, screenToWorld, findAnchor, saveAnnotation, setLocalAnnotations, updatePresence }: UseCanvasAnnotationsOptions) {
  const [activeTool, setActiveTool] = useState<AnnotationTool>("select");
  const [selectedId, setSelectedId] = useState("");
  const [visible, setVisible] = useState(true);
  const [draft, setDraft] = useState<CanvasAnnotation | null>(null);
  const [gesture, setGesture] = useState<Gesture>(null);
  const historyRef = useRef<HistoryEntry[]>([]);
  const redoRef = useRef<HistoryEntry[]>([]);
  const editingBeforeRef = useRef<CanvasAnnotation | null>(null);

  const canvasAnnotations = useMemo(() => annotations.filter((annotation) => annotation.canvasType === canvasType && annotation.canvasId === canvasId), [annotations, canvasId, canvasType]);
  const selected = useMemo(() => canvasAnnotations.find((annotation) => annotation.id === selectedId), [canvasAnnotations, selectedId]);

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

  const selectAnnotation = useCallback((id: string) => {
    setSelectedId(id);
    void updatePresence(id, "");
  }, [updatePresence]);

  const selectTool = useCallback((tool: AnnotationTool) => {
    setActiveTool(tool);
    if (tool !== "select") {
      setSelectedId("");
      void updatePresence("", "");
    }
  }, [updatePresence]);

  const handleCanvasPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (activeTool === "select") return false;
    if ((event.target as HTMLElement).closest("[data-annotation-control='true']")) return false;
    event.preventDefault();
    event.stopPropagation();
    const point = screenToWorld(event.clientX, event.clientY);
    const annotation = defaultAnnotation(activeTool, canvasType, canvasId, point);
    annotation.zIndex = Math.max(0, ...canvasAnnotations.filter((item) => item.layer === annotation.layer).map((item) => item.zIndex ?? 0)) + 1;
    annotation.createdBy = me.id;
    annotation.updatedBy = me.id;
    if (annotation.kind === "sticky_note") {
      setActiveTool("select");
      setSelectedId(annotation.id);
      void updatePresence(annotation.id, annotation.id);
      editingBeforeRef.current = annotation;
      updateLocal(annotation);
      void saveAnnotation(annotation, { create: true }).then((saved) => {
        if (saved) historyRef.current.push({ after: annotation });
        else updateLocal(undefined, annotation.id);
      });
      return true;
    }
    if (annotation.kind === "arrow") {
      annotation.start = findAnchor(point) ?? point;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    setGesture({ type: "draw", pointerId: event.pointerId, annotation });
    setDraft(annotation);
    return true;
  }, [activeTool, canvasAnnotations, canvasId, canvasType, findAnchor, me.id, saveAnnotation, screenToWorld, updateLocal, updatePresence]);

  const handleAnnotationPointerDown = useCallback((event: ReactPointerEvent<HTMLElement | SVGElement>, annotation: CanvasAnnotation, mode: "move" | "resize" = "move") => {
    if (activeTool !== "select") return;
    event.preventDefault();
    event.stopPropagation();
    const point = screenToWorld(event.clientX, event.clientY);
    selectAnnotation(annotation.id);
    event.currentTarget.setPointerCapture(event.pointerId);
    setGesture({ type: mode, pointerId: event.pointerId, annotationId: annotation.id, origin: point, before: annotation, current: annotation });
  }, [activeTool, screenToWorld, selectAnnotation]);

  const handleCanvasPointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!gesture || gesture.pointerId !== event.pointerId) return false;
    const point = screenToWorld(event.clientX, event.clientY);
    if (gesture.type === "draw") {
      const next = gesture.annotation.kind === "arrow"
        ? { ...gesture.annotation, end: findAnchor(point) ?? point }
        : { ...gesture.annotation, points: [...(gesture.annotation.points ?? []), point] };
      setGesture({ ...gesture, annotation: next });
      setDraft(next);
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
    if (gesture.type === "draw") {
      const annotation = gesture.annotation;
      const valid = annotation.kind === "arrow"
        ? !!annotation.start && !!annotation.end && (annotation.start.itemId !== annotation.end.itemId || Math.hypot(annotation.end.x - annotation.start.x, annotation.end.y - annotation.start.y) > 8)
        : (annotation.points?.length ?? 0) >= (annotation.kind === "background_boundary" ? 3 : 2);
      if (event.type !== "pointercancel" && valid) {
        setSelectedId(annotation.id);
        setActiveTool("select");
        void updatePresence(annotation.id, "");
        void recordAndSave(undefined, annotation);
      }
    } else {
      const after = gesture.current;
      if (event.type !== "pointercancel" && after && JSON.stringify(after) !== JSON.stringify(gesture.before)) void recordAndSave(gesture.before, after);
    }
    setDraft(null);
    setGesture(null);
    return true;
  }, [gesture, recordAndSave, updatePresence]);

  const beginTextEdit = useCallback((annotation: CanvasAnnotation) => {
    editingBeforeRef.current = annotation;
    setSelectedId(annotation.id);
    void updatePresence(annotation.id, annotation.id);
  }, [updatePresence]);

  const finishTextEdit = useCallback((annotation: CanvasAnnotation) => {
    const before = editingBeforeRef.current;
    editingBeforeRef.current = null;
    void updatePresence(annotation.id, "");
    if (before && JSON.stringify(before) !== JSON.stringify(annotation)) void recordAndSave(before, annotation);
  }, [recordAndSave, updatePresence]);

  const deleteSelected = useCallback(() => {
    if (!selected) return;
    setSelectedId("");
    void updatePresence("", "");
    void recordAndSave(selected, undefined);
  }, [recordAndSave, selected, updatePresence]);

  const clearSelection = useCallback(() => {
    setSelectedId("");
    void updatePresence("", "");
  }, [updatePresence]);

  useEffect(() => {
    setSelectedId("");
    setActiveTool("select");
    setDraft(null);
    setGesture(null);
    void updatePresence("", "");
  }, [canvasId, canvasType, updatePresence]);

  useEffect(() => () => { void updatePresence("", ""); }, [updatePresence]);

  const detachItem = useCallback((itemId: string, resolveAnchor: (anchor: AnnotationAnchor) => CanvasPoint) => {
    for (const annotation of canvasAnnotations) {
      if (annotation.kind !== "arrow") continue;
      let changed = false;
      let start = annotation.start;
      let end = annotation.end;
      if (start?.itemId === itemId) { start = resolveAnchor(start); changed = true; }
      if (end?.itemId === itemId) { end = resolveAnchor(end); changed = true; }
      if (changed) void recordAndSave(annotation, { ...annotation, start, end, updatedBy: me.id });
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
    if (!selected || selected.kind !== "freehand_stroke" || (selected.points?.length ?? 0) < 3) return;
    void recordAndSave(selected, { ...selected, kind: "background_boundary", layer: "background", color: "#2563eb", fill: "#dbeafe55", strokeWidth: Math.max(4, selected.strokeWidth), updatedBy: me.id });
  }, [me.id, recordAndSave, selected]);

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
        setActiveTool("select");
        setDraft(null);
        setGesture(null);
        return;
      }
      if ((event.key === "Delete" || event.key === "Backspace") && selectedId) {
        event.preventDefault();
        deleteSelected();
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z" && selectedId) {
        event.preventDefault();
        if (event.shiftKey) redo(); else undo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deleteSelected, redo, selectedId, undo]);

  return {
    activeTool, selectTool, selectedId, selected, visible, setVisible, draft,
    canvasAnnotations,
    handleCanvasPointerDown, handleCanvasPointerMove, handleCanvasPointerUp,
    handleAnnotationPointerDown, selectAnnotation,
    beginTextEdit, finishTextEdit,
    deleteSelected, duplicateSelected, changeSelectedColor, convertSelectedToBoundary, moveSelectedForward, moveSelectedBackward, clearSelection, detachItem, undo, redo,
    canUndo: historyRef.current.length > 0,
    canRedo: redoRef.current.length > 0,
    palette: notePalette
  };
}

export type CanvasAnnotationController = ReturnType<typeof useCanvasAnnotations>;
