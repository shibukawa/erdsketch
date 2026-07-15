import { startTransition, useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import type { Collaborator } from "../collaboration";
import type { CardDisplayMode, DataDomain, DfdFlow, DfdGroup, DfdNode, DfdState, DomainCategory, ErdCanvas, ModelField, ModelSeed, NameDisplayMode, RefinementResult, Relationship, RelationshipReference, Viewport } from "../features/modeling/types";
import { DFD_NODE_SIZE, dfdWarnings, endpointBounds, endpointClass, findDfdNodePlacement, groupAfterOverlap, normalizeDfdCrud, validEndpointPair, withModelCrud, type DfdWarning } from "../features/dfd/dfd";
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

type DfdWorkspaceProps = {
  dfd: DfdState;
  erdCanvases: ErdCanvas[];
  activeCanvasId: string;
  models: ModelSeed[];
  me: Collaborator;
  users: Collaborator[];
  connected: boolean;
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
};

type DragState =
  | { type: "pan"; pointerId: number; startX: number; startY: number; origin: Viewport }
  | { type: "node"; pointerId: number; nodeId: string; offsetX: number; offsetY: number }
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

export function DfdWorkspace({ dfd, erdCanvases, activeCanvasId, models, me, users, connected, onSetLocalDfd, onSaveDfd, onSaveCatalogModel, onSetLocalModels, relationships, relationshipReferences, domains, domainCategories, nameDisplayMode, vocabularyCache, onLockModel, onUnlockModel, onUpdateRelationshipReference, onDeleteRelationship, onCreateDomain, onOpenDomainDictionary, onApplyRefinement, onActiveCanvasChange, onSelectErdCanvas, onCreateProjectCanvas, onRenameProjectCanvas, onOpenCrudMatrix }: DfdWorkspaceProps) {
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

  useEffect(() => { dfdRef.current = dfd; }, [dfd]);
  useEffect(() => { modelsRef.current = models; }, [models]);
  useEffect(() => () => { for (const timer of modelSaveTimersRef.current.values()) clearTimeout(timer); }, []);
  useEffect(() => {
    if (dfd.canvases.some((canvas) => canvas.id === activeCanvasId)) return;
    onActiveCanvasChange(dfd.canvases[0]?.id ?? "dfd-main");
  }, [activeCanvasId, dfd.canvases, onActiveCanvasChange]);

  const activeNodes = useMemo(() => dfd.nodes.filter((node) => node.canvasId === activeCanvasId), [activeCanvasId, dfd.nodes]);
  const activeGroups = useMemo(() => dfd.groups.filter((group) => group.canvasId === activeCanvasId), [activeCanvasId, dfd.groups]);
  const activeFlows = useMemo(() => dfd.flows.filter((flow) => flow.canvasId === activeCanvasId), [activeCanvasId, dfd.flows]);
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
    setSelectedEndpointId(id);
    setSelectedFlowId(undefined);
  }, []);
  const selectFlow = useCallback((id: string) => { setSelectedFlowId(id); setSelectedEndpointId(undefined); setConnectionSourceId(undefined); }, []);

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
    const current = dfdRef.current;
    const flows = current.flows.flatMap((flow) => {
      const sourceIds = flow.sourceId === selectedGroup.id ? selectedGroup.memberIds : [flow.sourceId];
      const destinationIds = flow.destinationId === selectedGroup.id ? selectedGroup.memberIds : [flow.destinationId];
      return sourceIds.flatMap((sourceId) => destinationIds.map((destinationId, index) => ({
        ...flow,
        id: sourceIds.length === 1 && destinationIds.length === 1 && index === 0 ? flow.id : crypto.randomUUID(),
        sourceId,
        destinationId
      })));
    });
    persistDfd(normalizeDfdCrud({ ...dfdRef.current, groups: dfdRef.current.groups.filter((group) => group.id !== selectedGroup.id), flows }));
    setSelectedEndpointId(selectedGroup.memberIds[0]);
  }, [persistDfd, selectedGroup]);
  const deleteSelected = useCallback(() => {
    const current = dfdRef.current;
    if (selectedFlow) { persistDfd({ ...current, flows: current.flows.filter((flow) => flow.id !== selectedFlow.id) }); setSelectedFlowId(undefined); return; }
    if (selectedGroup) { persistDfd({ ...current, groups: current.groups.filter((group) => group.id !== selectedGroup.id), flows: current.flows.filter((flow) => flow.sourceId !== selectedGroup.id && flow.destinationId !== selectedGroup.id) }); setSelectedEndpointId(undefined); return; }
    if (!selectedNode) return;
    const affectedGroups = current.groups.filter((group) => group.memberIds.includes(selectedNode.id));
    const affectedGroupIDs = new Set(affectedGroups.map((group) => group.id));
    persistDfd({ ...current, nodes: current.nodes.filter((node) => node.id !== selectedNode.id), groups: current.groups.filter((group) => !affectedGroupIDs.has(group.id)), flows: current.flows.filter((flow) => flow.sourceId !== selectedNode.id && flow.destinationId !== selectedNode.id && !affectedGroupIDs.has(flow.sourceId) && !affectedGroupIDs.has(flow.destinationId)) });
    setSelectedEndpointId(undefined);
  }, [persistDfd, selectedFlow, selectedGroup, selectedNode]);

  const nodePointerDown = useCallback((event: PointerEvent<HTMLElement>, node: DfdNode) => {
    event.stopPropagation();
    const point = worldPoint(event.clientX, event.clientY);
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedEndpointId(node.id);
    setSelectedFlowId(undefined);
    setDragState({ type: "node", pointerId: event.pointerId, nodeId: node.id, offsetX: point.x - node.x, offsetY: point.y - node.y });
  }, [worldPoint]);
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
    const target = event.target as HTMLElement;
    if (target.closest("[data-dfd-node], [data-dfd-group], [data-dfd-flow], button, input, textarea, select, [role='dialog']")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedEndpointId(undefined); setSelectedFlowId(undefined);
    setDragState({ type: "pan", pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, origin: viewport });
  }, [viewport]);
  const canvasPointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
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
    setLocalDfd({ ...dfdRef.current, nodes: dfdRef.current.nodes.map((node) => node.id === dragState.nodeId ? { ...node, x: point.x - dragState.offsetX, y: point.y - dragState.offsetY } : node) });
  }, [activeGroups, activeNodes, dragState, setLocalDfd, worldPoint]);
  const canvasPointerUp = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    if (dragState.type === "connection") {
      if (dragState.targetId) beginConnection(dragState.sourceId, dragState.targetId);
      setConnectionSourceId(undefined); setDragState(null); return;
    }
    const next = dragState.type === "node" ? groupAfterOverlap(dfdRef.current, dragState.nodeId) : dfdRef.current;
    if (dragState.type === "node") persistDfd(next);
    setDragState(null);
  }, [beginConnection, dragState, persistDfd]);
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

  return <main className="h-screen overflow-hidden bg-slate-100 text-slate-950"><div className="flex h-full"><DfdSidebar selectedNode={selectedNode} selectedGroup={selectedGroup} selectedFlow={selectedFlow} selectedModel={selectedModel} warnings={warnings} nodes={activeNodes} groups={activeGroups} models={models} displayMode={cardDisplayMode} externalDefinitions={externalDefinitions} onDisplayModeChange={setCardDisplayMode} onQuickCreate={quickCreate} onOpenModelPicker={() => setModelPickerOpen(true)} onUpdateNode={updateSelectedNode} onUpdateFlow={updateSelectedFlow} onUpdateModel={updateSelectedModel} onUngroup={ungroup} onDeleteSelected={deleteSelected} onFocusWarning={focusWarning} /><section className="flex min-w-0 flex-1 flex-col"><DfdWorkspaceHeader me={me} users={users} connected={connected} canvasName={dfd.canvases.find((canvas) => canvas.id === activeCanvasId)?.name ?? "DFD canvas"} scale={viewport.scale} onOpenCanvasSelector={() => setCanvasSelectorOpen(true)} onOpenModelPicker={() => setModelPickerOpen(true)} onOpenCrudMatrix={onOpenCrudMatrix} onResetView={() => setViewport({ x: 250, y: 130, scale: 1 })} onUpdateScale={(scale) => updateScale(scale)} /><DfdCanvas canvasRef={canvasRef} nodes={activeNodes} groups={activeGroups} flows={activeFlows} models={models} viewport={viewport} selectedEndpointId={selectedEndpointId} selectedFlowId={selectedFlowId} connectionSourceId={connectionSourceId} connectionDrag={dragState?.type === "connection" ? dragState : undefined} connectionDropTargetId={dragState?.type === "connection" ? dragState.targetId : undefined} tip={tip} displayMode={cardDisplayMode} onCanvasPointerDown={canvasPointerDown} onCanvasPointerMove={canvasPointerMove} onCanvasPointerUp={canvasPointerUp} onNodePointerDown={nodePointerDown} onLinkPointerDown={linkPointerDown} onGroupLinkPointerDown={groupLinkPointerDown} onEditModelFields={(node) => void openModelFields(node)} onUpdateNode={updateSelectedNode} onUpdateModel={updateSelectedModel} onSelectEndpoint={selectEndpoint} onSelectFlow={selectFlow} /></section></div>
    {nodeDialog && <DfdNodeDialog mode={nodeDialog.mode} initial={nodeDialog.initial} title={nodeDialog.title} existingExternalDefinitions={externalDefinitions} onSave={saveNodeDialog} onClose={() => setNodeDialog(undefined)} />}
    {modelPickerOpen && <DfdModelPickerDialog models={models} placedModelIds={placedModelIds} onPlace={placeModel} onCreate={createModel} onClose={() => setModelPickerOpen(false)} />}
    {canvasSelectorOpen && <ProjectCanvasSelectorDialog erdCanvases={erdCanvases} dfdCanvases={dfd.canvases} active={{ kind: "dfd", id: activeCanvasId }} onSelect={selectProjectCanvas} onCreate={onCreateProjectCanvas} onRename={onRenameProjectCanvas} onClose={() => setCanvasSelectorOpen(false)} />}
    {fieldEditorModel && <FieldListDialog modelId={fieldEditorModel.id} modelTitle={fieldEditorModel.title} modelNames={fieldEditorModel.names} initialNameDisplayMode={nameDisplayMode} vocabularyCache={vocabularyCache} modelMaturedLevel={fieldEditorModel.maturedLevel} fields={fieldEditorModel.fields} domains={domains} domainCategories={domainCategories} relationshipReferences={projectedReferences} seeds={models} allRelationships={relationships} allRelationshipReferences={relationshipReferences} canEdit onChange={changeModelFields} onModelChange={changeModelDefinition} onClose={closeModelFields} onUpdateReference={onUpdateRelationshipReference} onDeleteReference={onDeleteRelationship} onCreateDomain={onCreateDomain} onOpenDomainDictionary={(fieldId) => onOpenDomainDictionary(fieldEditorModel.id, fieldId)} onApplyRefinement={onApplyRefinement} />}
  </main>;
}
