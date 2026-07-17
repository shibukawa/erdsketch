import { startTransition, useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import type { Collaborator } from "../collaboration";
import type { CardDisplayMode, DataDomain, DfdFlow, DfdGroup, DfdNode, DfdState, DomainCategory, ErdCanvas, ModelField, ModelSeed, NameDisplayMode, RefinementResult, Relationship, RelationshipReference, Viewport } from "../features/modeling/types";
import { DFD_NODE_SIZE, dfdWarnings, endpointBounds, endpointClass, findDfdNodePlacement, groupAfterOverlapWithRestoration, normalizeDfdCrud, ungroupDfd, validEndpointPair, withModelCrud, type DfdGroupFlowRestoration, type DfdWarning } from "../features/dfd/dfd";
import { DfdCanvas } from "../components/dfd/DfdCanvas";
import { DfdModelPickerDialog } from "../components/dfd/DfdModelPickerDialog";
import { DfdNodeDialog, type DfdNodeDraft } from "../components/dfd/DfdNodeDialog";
import { DfdSidebar } from "../components/dfd/DfdSidebar";
import { DfdWorkspaceHeader } from "../components/dfd/DfdWorkspaceHeader";
import type { DfdQuickCreateKind } from "../components/dfd/DfdQuickCreate";
import { FieldListDialog } from "../components/diagram/FieldListDialog";
import { ProjectCanvasSelectorDialog, type ProjectCanvasKind } from "../components/layout/ProjectCanvasSelectorDialog";
import type { VocabularyMatchCache } from "../features/modeling/vocabulary";
import { relationshipDisplaySeedIDs } from "../features/modeling/utils";
import { defaultVolumeEstimate } from "../features/modeling/capacity";
import type { AnnotationAnchor, CanvasAnnotation, CanvasPoint, SaveAnnotation } from "../features/annotations/types";
import { useCanvasAnnotations } from "../features/annotations/useCanvasAnnotations";

type DfdWorkspaceProps = {
  dfd: DfdState;
  erdCanvases: ErdCanvas[];
  activeCanvasId: string;
  models: ModelSeed[];
  me: Collaborator;
  users: Collaborator[];
  connected: boolean;
  isHost: boolean;
  recoveryReady: boolean;
  persistentStorage: boolean;
  recoveryError?: string;
  activeProject?: { displayName: string; kind: "named" | "temporary" };
  onOpenProjectManager: () => void;
  onOpenExport: (displayMode: CardDisplayMode) => void;
  onSetLocalDfd: (dfd: DfdState) => void;
  onSaveDfd: (dfd: DfdState) => Promise<boolean>;
  onSaveCatalogModel: (model: ModelSeed, create?: boolean) => Promise<boolean>;
  onSetLocalModels: (models: ModelSeed[]) => void;
  relationships: Relationship[];
  relationshipReferences: RelationshipReference[];
  domains: DataDomain[];
  domainCategories: DomainCategory[];
  nameDisplayMode: NameDisplayMode;
  vocabularyCache: VocabularyMatchCache;
  onLockModel: (modelId: string) => Promise<boolean>;
  onUnlockModel: (modelId: string) => Promise<void>;
  onUpdateRelationshipReference: (relationshipId: string, patch: Partial<RelationshipReference>) => void;
  onDeleteRelationship: (relationshipId: string) => void;
  onCreateDomain: (name: string) => void;
  onOpenDomainDictionary: (modelId: string, fieldId?: string) => void;
  onApplyRefinement: (result: RefinementResult) => Promise<boolean>;
  onActiveCanvasChange: (canvasId: string) => void;
  onSelectErdCanvas: (canvasId: string) => void;
  onCreateProjectCanvas: (kind: ProjectCanvasKind, name: string) => Promise<boolean>;
  onRenameProjectCanvas: (kind: ProjectCanvasKind, canvas: { id: string; name: string }) => Promise<boolean>;
  onOpenCrudMatrix: () => void;
  onShareWork: () => void;
  annotations: CanvasAnnotation[];
  onSetLocalAnnotations: (next: CanvasAnnotation[] | ((current: CanvasAnnotation[]) => CanvasAnnotation[])) => void;
  onSaveAnnotation: SaveAnnotation;
  onUpdateAnnotationPresence: (selectionId?: string, editingAnnotationId?: string) => Promise<boolean>;
  onMoveCursor: (x: number, y: number) => void;
  onChangeCanvasPresence: (canvasId: string, canvasType?: "erd" | "dfd") => Promise<boolean>;
};

type DragState =
  | { type: "pan"; pointerId: number; startX: number; startY: number; origin: Viewport }
  | { type: "node"; pointerId: number; nodeId: string; offsetX: number; offsetY: number; current: DfdState }
  | { type: "connection"; pointerId: number; sourceId: string; x: number; y: number; targetId?: string }
  | null;

type NodeDialogState = {
  mode: "process" | "external" | "intermediate";
  initial?: DfdNode;
  forced?: { sourceId: string; destinationId: string };
  title?: string;
};

const dailyTips = [
  "DFD is not a flowchart. Arrows show data movement, not execution order.",
  "Draw the maximum set of normal-case flows that may occur.",
  "Do not draw conditional flows such as only when the input type is X.",
  "Push and pull do not change arrow direction; use the optional label when useful.",
  "Overlap same-class nodes to replace repeated lines with one grouped flow."
];

export function DfdWorkspace({ dfd, erdCanvases, activeCanvasId, models, me, users, connected, isHost, recoveryReady, persistentStorage, recoveryError, activeProject, onOpenProjectManager, onOpenExport, onSetLocalDfd, onSaveDfd, onSaveCatalogModel, onSetLocalModels, relationships, relationshipReferences, domains, domainCategories, nameDisplayMode, vocabularyCache, onLockModel, onUnlockModel, onUpdateRelationshipReference, onDeleteRelationship, onCreateDomain, onOpenDomainDictionary, onApplyRefinement, onActiveCanvasChange, onSelectErdCanvas, onCreateProjectCanvas, onRenameProjectCanvas, onOpenCrudMatrix, onShareWork, annotations, onSetLocalAnnotations, onSaveAnnotation, onUpdateAnnotationPresence, onMoveCursor, onChangeCanvasPresence }: DfdWorkspaceProps) {
  const [viewport, setViewport] = useState<Viewport>({ x: 250, y: 130, scale: 1 });
  const [cardDisplayMode, setCardDisplayMode] = useState<CardDisplayMode>("description");
  const [selectedEndpointId, setSelectedEndpointId] = useState<string>();
  const [selectedFlowId, setSelectedFlowId] = useState<string>();
  const [connectionSourceId, setConnectionSourceId] = useState<string>();
  const [dragState, setDragState] = useState<DragState>(null);
  const [nodeDialog, setNodeDialog] = useState<NodeDialogState>();
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  const [canvasSelectorOpen, setCanvasSelectorOpen] = useState(false);
  const [fieldEditorModelId, setFieldEditorModelId] = useState<string>();
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const dfdRef = useRef(dfd);
  const modelsRef = useRef(models);
  const pendingModelUpdatesRef = useRef(new Map<string, ModelSeed>());
  const modelSaveTimersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const groupFlowRestorationsRef = useRef(new Map<string, DfdGroupFlowRestoration>());
  const openExport = useCallback(() => onOpenExport(cardDisplayMode), [cardDisplayMode, onOpenExport]);
  const resetView = useCallback(() => setViewport({ x: 250, y: 130, scale: 1 }), []);

  useEffect(() => { dfdRef.current = dfd; }, [dfd]);
  useEffect(() => { modelsRef.current = models; }, [models]);
  useEffect(() => () => { for (const timer of modelSaveTimersRef.current.values()) clearTimeout(timer); }, []);
  useEffect(() => {
    if (dfd.canvases.some((canvas) => canvas.id === activeCanvasId)) return;
    onActiveCanvasChange(dfd.canvases[0]?.id ?? "dfd-main");
  }, [activeCanvasId, dfd.canvases, onActiveCanvasChange]);
  useEffect(() => { void onChangeCanvasPresence(activeCanvasId, "dfd"); }, [activeCanvasId, onChangeCanvasPresence]);

  const visibleDfd = dragState?.type === "node" ? dragState.current : dfd;
  const activeNodes = useMemo(() => visibleDfd.nodes.filter((node) => node.canvasId === activeCanvasId), [activeCanvasId, visibleDfd.nodes]);
  const activeGroups = useMemo(() => visibleDfd.groups.filter((group) => group.canvasId === activeCanvasId), [activeCanvasId, visibleDfd.groups]);
  const activeFlows = useMemo(() => visibleDfd.flows.filter((flow) => flow.canvasId === activeCanvasId), [activeCanvasId, visibleDfd.flows]);
  const selectedNode = useMemo(() => activeNodes.find((node) => node.id === selectedEndpointId), [activeNodes, selectedEndpointId]);
  const selectedGroup = useMemo(() => activeGroups.find((group) => group.id === selectedEndpointId), [activeGroups, selectedEndpointId]);
  const selectedFlow = useMemo(() => activeFlows.find((flow) => flow.id === selectedFlowId), [activeFlows, selectedFlowId]);
  const selectedModel = useMemo(() => models.find((model) => model.id === selectedNode?.modelId), [models, selectedNode?.modelId]);
  const fieldEditorModel = useMemo(() => models.find((model) => model.id === fieldEditorModelId), [fieldEditorModelId, models]);
  const warnings = useMemo(() => dfdWarnings(dfd, activeCanvasId, models), [activeCanvasId, dfd, models]);
  const tip = dailyTips[Math.floor(Date.now() / 86_400_000) % dailyTips.length];

  const setLocalDfd = useCallback((next: DfdState) => { dfdRef.current = next; onSetLocalDfd(next); }, [onSetLocalDfd]);
  const persistDfd = useCallback((next: DfdState) => {
    setLocalDfd(next);
    void onSaveDfd(next).then((saved) => { if (!saved) window.alert("The DFD change could not be saved."); });
  }, [onSaveDfd, setLocalDfd]);
  const worldPoint = useCallback((clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 120, y: 100 };
    return { x: (clientX - rect.left - viewport.x) / viewport.scale, y: (clientY - rect.top - viewport.y) / viewport.scale };
  }, [viewport]);
  const findDfdAnnotationAnchor = useCallback((point: CanvasPoint): AnnotationAnchor | undefined => {
    const node = [...activeNodes].reverse().find((item) => {
      const bounds = endpointBounds(item.id, activeNodes, activeGroups);
      return Boolean(bounds && point.x >= bounds.x && point.x <= bounds.x + bounds.width && point.y >= bounds.y && point.y <= bounds.y + bounds.height);
    });
    const group = node ? undefined : [...activeGroups].reverse().find((item) => {
      const bounds = endpointBounds(item.id, activeNodes, activeGroups);
      return Boolean(bounds && point.x >= bounds.x && point.x <= bounds.x + bounds.width && point.y >= bounds.y && point.y <= bounds.y + bounds.height);
    });
    const endpoint = node ?? group;
    if (!endpoint) return undefined;
    const bounds = endpointBounds(endpoint.id, activeNodes, activeGroups)!;
    return { x: point.x - bounds.x, y: point.y - bounds.y, itemId: endpoint.id, itemKind: node ? "dfd_node" : "dfd_group" };
  }, [activeGroups, activeNodes]);
  const resolveDfdAnnotationAnchor = useCallback((anchor: AnnotationAnchor): CanvasPoint => {
    if (!anchor.itemId) return anchor;
    const bounds = endpointBounds(anchor.itemId, activeNodes, activeGroups);
    return bounds ? { x: bounds.x + anchor.x, y: bounds.y + anchor.y } : anchor;
  }, [activeGroups, activeNodes]);
  const annotationController = useCanvasAnnotations({ canvasType: "dfd", canvasId: activeCanvasId, annotations, me, screenToWorld: worldPoint, findAnchor: findDfdAnnotationAnchor, saveAnnotation: onSaveAnnotation, setLocalAnnotations: onSetLocalAnnotations, updatePresence: onUpdateAnnotationPresence });
  const nextPosition = useCallback((kind: DfdNode["kind"]) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    const center = rect
      ? { x: (rect.width / 2 - viewport.x) / viewport.scale, y: (rect.height / 2 - viewport.y) / viewport.scale }
      : { x: 600, y: 400 };
    return findDfdNodePlacement(center, kind, dfdRef.current.nodes, dfdRef.current.groups, activeCanvasId);
  }, [activeCanvasId, viewport]);

  const beginConnection = useCallback((sourceId: string, destinationId: string) => {
    if (destinationId === sourceId) return;
    const current = dfdRef.current;
    const sourceClass = endpointClass(sourceId, current.nodes, current.groups);
    const destinationClass = endpointClass(destinationId, current.nodes, current.groups);
    const sourceBounds = endpointBounds(sourceId, current.nodes, current.groups);
    const destinationBounds = endpointBounds(destinationId, current.nodes, current.groups);
    if (!sourceClass || !destinationClass || !sourceBounds || !destinationBounds) return;
    if (sourceClass === destinationClass) {
      if (sourceClass === "external") {
        window.alert("External entities cannot connect directly to each other.");
        return;
      }
      setNodeDialog({
        mode: sourceClass === "process" ? "intermediate" : "process",
        forced: { sourceId, destinationId },
        title: sourceClass === "process" ? "Choose intermediate data" : "Insert process between data entities"
      });
      return;
    }
    if (!validEndpointPair(sourceId, destinationId, current.nodes, current.groups)) {
      window.alert("This endpoint pair is not valid in the DFD.");
      return;
    }
    const flow = withModelCrud({ id: crypto.randomUUID(), canvasId: activeCanvasId, sourceId, destinationId }, current.nodes, current.groups);
    persistDfd({ ...current, flows: [...current.flows, flow] });
    setSelectedEndpointId(undefined);
    setSelectedFlowId(flow.id);
  }, [activeCanvasId, persistDfd]);

  const selectEndpoint = useCallback((id: string) => {
    annotationController.clearSelection();
    setSelectedEndpointId(id);
    setSelectedFlowId(undefined);
  }, [annotationController]);
  const selectFlow = useCallback((id: string) => { annotationController.clearSelection(); setSelectedFlowId(id); setSelectedEndpointId(undefined); setConnectionSourceId(undefined); }, [annotationController]);

  const saveNodeDialog = useCallback((draft: DfdNodeDraft) => {
    if (!nodeDialog) return;
    const current = dfdRef.current;
    if (nodeDialog.initial?.id) {
      const nodes = current.nodes.map((node) => node.id === nodeDialog.initial!.id ? { ...node, ...draft, definitionId: node.definitionId } : node);
      persistDfd(normalizeDfdCrud({ ...current, nodes }));
      setNodeDialog(undefined);
      return;
    }
    const kind = nodeDialog.mode;
    let nodes = current.nodes;
    let position = nextPosition(kind);
    if (nodeDialog.forced) {
      const source = endpointBounds(nodeDialog.forced.sourceId, current.nodes, current.groups)!;
      const destination = endpointBounds(nodeDialog.forced.destinationId, current.nodes, current.groups)!;
      const inserted = DFD_NODE_SIZE[kind];
      position = {
        x: (source.x + source.width / 2 + destination.x + destination.width / 2) / 2 - inserted.width / 2,
        y: (source.y + source.height / 2 + destination.y + destination.height / 2) / 2 - inserted.height / 2
      };
    }
    const node: DfdNode = {
      id: crypto.randomUUID(), definitionId: draft.definitionId || crypto.randomUUID(), canvasId: activeCanvasId, kind,
      name: draft.name, description: draft.description, x: position.x, y: position.y,
      processKind: nodeDialog.mode === "process" ? draft.processKind ?? "batch" : undefined,
      physicalProcesses: nodeDialog.mode === "process" ? draft.physicalProcesses : undefined,
      intermediateKind: nodeDialog.mode === "intermediate" ? draft.intermediateKind ?? "file" : undefined,
      format: nodeDialog.mode === "intermediate" ? draft.format : undefined
    };
    let flows = current.flows;
    if (nodeDialog.forced) {
      flows = [...flows,
        withModelCrud({ id: crypto.randomUUID(), canvasId: activeCanvasId, sourceId: nodeDialog.forced.sourceId, destinationId: node.id }, [...nodes, node], current.groups),
        withModelCrud({ id: crypto.randomUUID(), canvasId: activeCanvasId, sourceId: node.id, destinationId: nodeDialog.forced.destinationId }, [...nodes, node], current.groups)
      ];
    }
    persistDfd({ ...current, nodes: [...nodes, node], flows });
    setSelectedEndpointId(node.id);
    setConnectionSourceId(undefined);
    setNodeDialog(undefined);
  }, [activeCanvasId, nextPosition, nodeDialog, persistDfd]);

  const placeModel = useCallback((modelId: string) => {
    const model = models.find((item) => item.id === modelId);
    if (!model) return;
    const position = nextPosition("model");
    const node: DfdNode = { id: crypto.randomUUID(), definitionId: model.id, canvasId: activeCanvasId, kind: "model", name: model.title, modelId: model.id, ...position };
    persistDfd({ ...dfdRef.current, nodes: [...dfdRef.current.nodes, node] });
    setSelectedEndpointId(node.id);
    setModelPickerOpen(false);
  }, [activeCanvasId, models, nextPosition, persistDfd]);
  const createModel = useCallback(async (input: { title: string; role: ModelSeed["role"]; dependency: ModelSeed["dependency"]; usageScope: "shared" | "dfd_only" }) => {
    const model: ModelSeed = { id: crypto.randomUUID(), title: input.title, description: "", fields: [], x: 0, y: 0, role: input.role, dependency: input.dependency, usageScope: input.usageScope, hasPrivacy: false, maturedLevel: 6, rotation: 0, volumeEstimate: defaultVolumeEstimate(input.role) };
    if (!(await onSaveCatalogModel(model, true))) return false;
    startTransition(() => onSetLocalModels([...models, model]));
    const position = nextPosition("model");
    const node: DfdNode = { id: crypto.randomUUID(), definitionId: model.id, canvasId: activeCanvasId, kind: "model", name: model.title, modelId: model.id, ...position };
    persistDfd({ ...dfdRef.current, nodes: [...dfdRef.current.nodes, node] });
    setSelectedEndpointId(node.id);
    setModelPickerOpen(false);
    return true;
  }, [activeCanvasId, models, nextPosition, onSaveCatalogModel, onSetLocalModels, persistDfd]);

  const quickCreate = useCallback(async (kind: DfdQuickCreateKind, name: string) => {
    if (kind === "model") {
      return createModel({ title: name, role: "work", dependency: "independent", usageScope: "shared" });
    }
    const nodeKind: DfdNode["kind"] = kind === "batch" || kind === "ui" ? "process" : kind === "file" || kind === "queue" ? "intermediate" : "external";
    const position = nextPosition(nodeKind);
    const node: DfdNode = kind === "batch" || kind === "ui"
      ? { id: crypto.randomUUID(), definitionId: crypto.randomUUID(), canvasId: activeCanvasId, kind: "process", processKind: kind, name, ...position }
      : kind === "file" || kind === "queue"
        ? { id: crypto.randomUUID(), definitionId: crypto.randomUUID(), canvasId: activeCanvasId, kind: "intermediate", intermediateKind: kind, name, format: kind === "file" ? "JSON" : undefined, ...position }
        : { id: crypto.randomUUID(), definitionId: crypto.randomUUID(), canvasId: activeCanvasId, kind: "external", name, ...position };
    persistDfd({ ...dfdRef.current, nodes: [...dfdRef.current.nodes, node] });
    setSelectedEndpointId(node.id);
    return true;
  }, [activeCanvasId, createModel, nextPosition, persistDfd]);

  const updateSelectedNode = useCallback((patch: Partial<DfdNode>) => {
    if (!selectedNode || selectedNode.kind === "model") return;
    persistDfd(normalizeDfdCrud({ ...dfdRef.current, nodes: dfdRef.current.nodes.map((node) => node.id === selectedNode.id ? { ...node, ...patch } : node) }));
  }, [persistDfd, selectedNode]);
  const updateSelectedFlow = useCallback((patch: Partial<DfdFlow>) => {
    if (!selectedFlow) return;
    const next = withModelCrud({ ...selectedFlow, ...patch }, dfdRef.current.nodes, dfdRef.current.groups);
    persistDfd({ ...dfdRef.current, flows: dfdRef.current.flows.map((flow) => flow.id === selectedFlow.id ? next : flow) });
  }, [persistDfd, selectedFlow]);
  const flushModelUpdate = useCallback(async (modelId: string) => {
    modelSaveTimersRef.current.delete(modelId);
    const pending = pendingModelUpdatesRef.current.get(modelId);
    if (!pending) return;
    if (!(await onLockModel(modelId))) {
      window.alert("This model is locked by another collaborator.");
      return;
    }
    if (!(await onSaveCatalogModel(pending))) window.alert("The model change could not be saved.");
    await onUnlockModel(modelId);
    if (pendingModelUpdatesRef.current.get(modelId) === pending) pendingModelUpdatesRef.current.delete(modelId);
  }, [onLockModel, onSaveCatalogModel, onUnlockModel]);
  const updateSelectedModel = useCallback((patch: Partial<ModelSeed>) => {
    if (!selectedModel) return;
    const base = pendingModelUpdatesRef.current.get(selectedModel.id) ?? modelsRef.current.find((model) => model.id === selectedModel.id);
    if (!base) return;
    const next = { ...base, ...patch };
    pendingModelUpdatesRef.current.set(next.id, next);
    const nextModels = modelsRef.current.map((model) => model.id === next.id ? next : model);
    modelsRef.current = nextModels;
    onSetLocalModels(nextModels);
    const currentTimer = modelSaveTimersRef.current.get(next.id);
    if (currentTimer) clearTimeout(currentTimer);
    modelSaveTimersRef.current.set(next.id, setTimeout(() => { void flushModelUpdate(next.id); }, 300));
  }, [flushModelUpdate, onSetLocalModels, selectedModel]);

  const openModelFields = useCallback(async (node: DfdNode) => {
    if (!node.modelId) return;
    if (!(await onLockModel(node.modelId))) {
      window.alert("This model is locked by another collaborator.");
      return;
    }
    setFieldEditorModelId(node.modelId);
  }, [onLockModel]);
  const closeModelFields = useCallback(() => {
    if (fieldEditorModelId) void onUnlockModel(fieldEditorModelId);
    setFieldEditorModelId(undefined);
  }, [fieldEditorModelId, onUnlockModel]);
  const changeModelFields = useCallback((fields: ModelField[]) => {
    if (!fieldEditorModel) return;
    const next = { ...fieldEditorModel, fields };
    onSetLocalModels(models.map((model) => model.id === next.id ? next : model));
    void onSaveCatalogModel(next);
  }, [fieldEditorModel, models, onSaveCatalogModel, onSetLocalModels]);
  const changeModelDefinition = useCallback((patch: Partial<ModelSeed>) => {
    if (!fieldEditorModel) return;
    const next = { ...fieldEditorModel, ...patch };
    onSetLocalModels(models.map((model) => model.id === next.id ? next : model));
    void onSaveCatalogModel(next);
  }, [fieldEditorModel, models, onSaveCatalogModel, onSetLocalModels]);
  const projectedReferences = useMemo(() => fieldEditorModel ? relationships.flatMap((relationship) => {
    if (!relationshipDisplaySeedIDs(relationship).includes(fieldEditorModel.id)) return [];
    const reference = relationshipReferences.find((item) => item.relationshipId === relationship.id);
    return reference ? [{ relationship, reference }] : [];
  }) : [], [fieldEditorModel, relationshipReferences, relationships]);
  const ungroup = useCallback(() => {
    if (!selectedGroup) return;
    persistDfd(ungroupDfd(dfdRef.current, selectedGroup.id, groupFlowRestorationsRef.current.get(selectedGroup.id)));
    groupFlowRestorationsRef.current.delete(selectedGroup.id);
    setSelectedEndpointId(selectedGroup.memberIds[0]);
  }, [persistDfd, selectedGroup]);
  const deleteSelected = useCallback(() => {
    const current = dfdRef.current;
    if (selectedFlow) { persistDfd({ ...current, flows: current.flows.filter((flow) => flow.id !== selectedFlow.id) }); setSelectedFlowId(undefined); return; }
    if (selectedGroup) { annotationController.detachItem(selectedGroup.id, resolveDfdAnnotationAnchor); groupFlowRestorationsRef.current.delete(selectedGroup.id); persistDfd({ ...current, groups: current.groups.filter((group) => group.id !== selectedGroup.id), flows: current.flows.filter((flow) => flow.sourceId !== selectedGroup.id && flow.destinationId !== selectedGroup.id) }); setSelectedEndpointId(undefined); return; }
    if (!selectedNode) return;
    const affectedGroups = current.groups.filter((group) => group.memberIds.includes(selectedNode.id));
    const affectedGroupIDs = new Set(affectedGroups.map((group) => group.id));
    annotationController.detachItem(selectedNode.id, resolveDfdAnnotationAnchor);
    for (const group of affectedGroups) annotationController.detachItem(group.id, resolveDfdAnnotationAnchor);
    persistDfd({ ...current, nodes: current.nodes.filter((node) => node.id !== selectedNode.id), groups: current.groups.filter((group) => !affectedGroupIDs.has(group.id)), flows: current.flows.filter((flow) => flow.sourceId !== selectedNode.id && flow.destinationId !== selectedNode.id && !affectedGroupIDs.has(flow.sourceId) && !affectedGroupIDs.has(flow.destinationId)) });
    setSelectedEndpointId(undefined);
  }, [annotationController, persistDfd, resolveDfdAnnotationAnchor, selectedFlow, selectedGroup, selectedNode]);

  const nodePointerDown = useCallback((event: PointerEvent<HTMLElement>, node: DfdNode) => {
    event.stopPropagation();
    annotationController.clearSelection();
    const point = worldPoint(event.clientX, event.clientY);
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedEndpointId(node.id);
    setSelectedFlowId(undefined);
    setDragState({ type: "node", pointerId: event.pointerId, nodeId: node.id, offsetX: point.x - node.x, offsetY: point.y - node.y, current: dfdRef.current });
  }, [annotationController, worldPoint]);
  const linkPointerDown = useCallback((event: PointerEvent<HTMLButtonElement>, node: DfdNode) => {
    event.preventDefault(); event.stopPropagation();
    const point = worldPoint(event.clientX, event.clientY);
    canvasRef.current?.setPointerCapture(event.pointerId);
    setConnectionSourceId(node.id);
    setDragState({ type: "connection", pointerId: event.pointerId, sourceId: node.id, x: point.x, y: point.y });
  }, [worldPoint]);
  const groupLinkPointerDown = useCallback((event: PointerEvent<HTMLElement>, group: DfdGroup) => {
    event.preventDefault(); event.stopPropagation();
    const point = worldPoint(event.clientX, event.clientY);
    canvasRef.current?.setPointerCapture(event.pointerId);
    setConnectionSourceId(group.id);
    setDragState({ type: "connection", pointerId: event.pointerId, sourceId: group.id, x: point.x, y: point.y });
  }, [worldPoint]);
  const canvasPointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (annotationController.handleCanvasPointerDown(event)) return;
    const target = event.target as HTMLElement;
    if (target.closest("[data-dfd-node], [data-dfd-group], [data-dfd-flow], button, input, textarea, select, [role='dialog']")) return;
    annotationController.clearSelection();
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedEndpointId(undefined); setSelectedFlowId(undefined);
    setDragState({ type: "pan", pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, origin: viewport });
  }, [annotationController, viewport]);
  const canvasPointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const cursor = worldPoint(event.clientX, event.clientY);
    onMoveCursor(cursor.x, cursor.y);
    if (annotationController.handleCanvasPointerMove(event)) return;
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    if (dragState.type === "pan") { setViewport({ ...dragState.origin, x: dragState.origin.x + event.clientX - dragState.startX, y: dragState.origin.y + event.clientY - dragState.startY }); return; }
    const point = worldPoint(event.clientX, event.clientY);
    if (dragState.type === "connection") {
      const nodeTarget = activeNodes.find((node) => node.id !== dragState.sourceId && point.x >= node.x && point.x <= node.x + DFD_NODE_SIZE[node.kind].width && point.y >= node.y && point.y <= node.y + DFD_NODE_SIZE[node.kind].height);
      const groupTarget = activeGroups.find((group) => { const bounds = endpointBounds(group.id, activeNodes, activeGroups); return group.id !== dragState.sourceId && Boolean(bounds && point.x >= bounds.x && point.x <= bounds.x + bounds.width && point.y >= bounds.y && point.y <= bounds.y + bounds.height); });
      const target = nodeTarget ?? groupTarget;
      setDragState({ ...dragState, x: point.x, y: point.y, targetId: target?.id });
      return;
    }
    const current = { ...dragState.current, nodes: dragState.current.nodes.map((node) => node.id === dragState.nodeId ? { ...node, x: point.x - dragState.offsetX, y: point.y - dragState.offsetY } : node) };
    setDragState({ ...dragState, current });
  }, [activeGroups, activeNodes, annotationController, dragState, onMoveCursor, worldPoint]);
  const canvasPointerUp = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (annotationController.handleCanvasPointerUp(event)) return;
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    if (dragState.type === "connection") {
      if (dragState.targetId) beginConnection(dragState.sourceId, dragState.targetId);
      setConnectionSourceId(undefined); setDragState(null); return;
    }
    if (dragState.type === "node" && event.type !== "pointercancel") {
      const result = groupAfterOverlapWithRestoration(dragState.current, dragState.nodeId);
      if (result.restoration) groupFlowRestorationsRef.current.set(result.restoration.groupId, result.restoration);
      persistDfd(result.state);
    }
    setDragState(null);
  }, [annotationController, beginConnection, dragState, persistDfd]);
  const updateScale = useCallback((nextScale: number, anchor?: { clientX: number; clientY: number }) => {
    const scale = Math.min(2.2, Math.max(0.35, nextScale));
    if (!anchor || !canvasRef.current) {
      setViewport((current) => ({ ...current, scale }));
      return;
    }
    const rect = canvasRef.current.getBoundingClientRect();
    const worldX = (anchor.clientX - rect.left - viewport.x) / viewport.scale;
    const worldY = (anchor.clientY - rect.top - viewport.y) / viewport.scale;
    setViewport({ scale, x: anchor.clientX - rect.left - worldX * scale, y: anchor.clientY - rect.top - worldY * scale });
  }, [viewport]);
  const handleWheel = useCallback((event: WheelEvent) => {
    event.preventDefault();
    if (event.ctrlKey || event.metaKey) {
      updateScale(viewport.scale * (event.deltaY > 0 ? 0.9 : 1.1), { clientX: event.clientX, clientY: event.clientY });
      return;
    }
    setViewport((current) => ({ ...current, x: current.x - event.deltaX, y: current.y - event.deltaY }));
  }, [updateScale, viewport.scale]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  const selectProjectCanvas = useCallback((kind: ProjectCanvasKind, id: string) => {
    setCanvasSelectorOpen(false);
    setSelectedEndpointId(undefined);
    setSelectedFlowId(undefined);
    if (kind === "erd") onSelectErdCanvas(id);
    else onActiveCanvasChange(id);
  }, [onActiveCanvasChange, onSelectErdCanvas]);
  const focusWarning = useCallback((warning: DfdWarning) => {
    if (!warning.nodeId) return;
    const node = dfdRef.current.nodes.find((item) => item.id === warning.nodeId);
    if (!node) return;
    setSelectedEndpointId(node.id);
    setViewport({ x: 420 - node.x, y: 260 - node.y, scale: 1 });
  }, []);

  const placedModelIds = useMemo(() => new Set(activeNodes.filter((node) => node.kind === "model").map((node) => node.modelId!)), [activeNodes]);
  const externalDefinitions = useMemo(() => [...new Map(dfd.nodes.filter((node) => node.kind === "external").map((node) => [node.definitionId, { id: node.definitionId, name: node.name }])).values()], [dfd.nodes]);
  const annotationUsers = users.filter((user) => user.canvasType === "dfd" && user.canvasId === activeCanvasId);
  const remoteUsers = annotationUsers.filter((user) => user.id !== me.id && (user.x !== 0 || user.y !== 0));

  return <main className="h-screen overflow-hidden bg-slate-100 text-slate-950"><div className="flex h-full"><DfdSidebar selectedNode={selectedNode} selectedGroup={selectedGroup} selectedFlow={selectedFlow} selectedModel={selectedModel} warnings={warnings} nodes={activeNodes} groups={activeGroups} models={models} displayMode={cardDisplayMode} externalDefinitions={externalDefinitions} onDisplayModeChange={setCardDisplayMode} onQuickCreate={quickCreate} onOpenModelPicker={() => setModelPickerOpen(true)} onUpdateNode={updateSelectedNode} onUpdateFlow={updateSelectedFlow} onUpdateModel={updateSelectedModel} onUngroup={ungroup} onDeleteSelected={deleteSelected} onFocusWarning={focusWarning} /><section className="flex min-w-0 flex-1 flex-col"><DfdWorkspaceHeader me={me} users={users} connected={connected} isHost={isHost} recoveryReady={recoveryReady} persistentStorage={persistentStorage} recoveryError={recoveryError} activeProject={activeProject} onOpenProjectManager={onOpenProjectManager} canvasName={dfd.canvases.find((canvas) => canvas.id === activeCanvasId)?.name ?? "DFD canvas"} onOpenCanvasSelector={() => setCanvasSelectorOpen(true)} onOpenModelPicker={() => setModelPickerOpen(true)} onOpenCrudMatrix={onOpenCrudMatrix} onShareWork={onShareWork} onOpenExport={openExport} /><DfdCanvas canvasRef={canvasRef} nodes={activeNodes} groups={activeGroups} flows={activeFlows} models={models} viewport={viewport} selectedEndpointId={selectedEndpointId} selectedFlowId={selectedFlowId} connectionSourceId={connectionSourceId} connectionDrag={dragState?.type === "connection" ? dragState : undefined} connectionDropTargetId={dragState?.type === "connection" ? dragState.targetId : undefined} tip={tip} displayMode={cardDisplayMode} onCanvasPointerDown={canvasPointerDown} onCanvasPointerMove={canvasPointerMove} onCanvasPointerUp={canvasPointerUp} onNodePointerDown={nodePointerDown} onLinkPointerDown={linkPointerDown} onGroupLinkPointerDown={groupLinkPointerDown} onEditModelFields={(node) => void openModelFields(node)} onUpdateNode={updateSelectedNode} onUpdateModel={updateSelectedModel} onSelectEndpoint={selectEndpoint} onSelectFlow={selectFlow} annotationController={annotationController} annotationUsers={annotationUsers} me={me} remoteUsers={remoteUsers} resolveAnnotationAnchor={resolveDfdAnnotationAnchor} onResetView={resetView} onUpdateScale={updateScale} /></section></div>
    {nodeDialog && <DfdNodeDialog mode={nodeDialog.mode} initial={nodeDialog.initial} title={nodeDialog.title} existingExternalDefinitions={externalDefinitions} onSave={saveNodeDialog} onClose={() => setNodeDialog(undefined)} />}
    {modelPickerOpen && <DfdModelPickerDialog models={models} placedModelIds={placedModelIds} onPlace={placeModel} onCreate={createModel} onClose={() => setModelPickerOpen(false)} />}
    {canvasSelectorOpen && <ProjectCanvasSelectorDialog erdCanvases={erdCanvases} dfdCanvases={dfd.canvases} active={{ kind: "dfd", id: activeCanvasId }} onSelect={selectProjectCanvas} onCreate={onCreateProjectCanvas} onRename={onRenameProjectCanvas} onClose={() => setCanvasSelectorOpen(false)} />}
    {fieldEditorModel && <FieldListDialog modelId={fieldEditorModel.id} modelTitle={fieldEditorModel.title} modelNames={fieldEditorModel.names} initialNameDisplayMode={nameDisplayMode} vocabularyCache={vocabularyCache} modelMaturedLevel={fieldEditorModel.maturedLevel} fields={fieldEditorModel.fields} domains={domains} domainCategories={domainCategories} relationshipReferences={projectedReferences} seeds={models} allRelationships={relationships} allRelationshipReferences={relationshipReferences} canEdit onChange={changeModelFields} onModelChange={changeModelDefinition} onClose={closeModelFields} onUpdateReference={onUpdateRelationshipReference} onDeleteReference={onDeleteRelationship} onCreateDomain={onCreateDomain} onOpenDomainDictionary={(fieldId) => onOpenDomainDictionary(fieldEditorModel.id, fieldId)} onApplyRefinement={onApplyRefinement} />}
  </main>;
}
