import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent
} from "react";
import { useCollaboration } from "../collaboration";
import { DiagramCanvas } from "../components/diagram/DiagramCanvas";
import { Sidebar } from "../components/layout/Sidebar";
import { WorkspaceHeader } from "../components/layout/WorkspaceHeader";
import { ProjectManagerDialog } from "../components/layout/ProjectManagerDialog";
import { RelationshipEditorDialog } from "../components/diagram/RelationshipEditorDialog";
import { DomainDictionaryDialog } from "../components/diagram/DomainDictionaryDialog";
import { VocabularyDialog } from "../components/diagram/VocabularyDialog";
import { VocabularyNavigationProvider } from "../components/diagram/VocabularyNavigationContext";
import { ProjectCanvasSelectorDialog, type ProjectCanvasKind } from "../components/layout/ProjectCanvasSelectorDialog";
import { WorkspaceStartDialog } from "../components/layout/WorkspaceStartDialog";
import { ModelCatalogDialog } from "../components/diagram/ModelCatalogDialog";
import { OwnershipTransferDialog } from "../components/diagram/OwnershipTransferDialog";
import { cardHeight, dependencyLabels, initialDomainCategories, initialDomains } from "../features/modeling/constants";
import { createStarterProjectState, starterProjects, type StarterProjectId } from "../features/modeling/starterProjects";
import type { CanvasModelPlacement, CardDisplayMode, DataDomain, DfdState, DomainCategory, DomainCategoryBundle, DragState, ErdCanvas, ModelSeed, NameDisplayMode, RefinementResult, Relationship, RelationshipReference, Viewport, VocabularyBinding, VocabularyEntry } from "../features/modeling/types";
import { getCachedDisplayName, replaceAliasInSource, type VocabularyMatch } from "../features/modeling/vocabulary";
import { useVocabularyMatchCache } from "../features/modeling/useVocabularyMatchCache";
import { defaultVolumeEstimate } from "../features/modeling/capacity";
import { clampScale, flattenLabels, getFieldEffectiveName, getModelCardWidth, getModelDescriptionCardHeight, getRelatedDragSeedIDs, getRelationshipDropTarget, getRelationshipReference, updateNameSet } from "../features/modeling/utils";
import { DfdWorkspace } from "./DfdWorkspace";
import { CrudMatrixDialog } from "../components/dfd/CrudMatrixDialog";
import { useCanvasAnnotations } from "../features/annotations/useCanvasAnnotations";
import type { AnnotationAnchor, CanvasPoint } from "../features/annotations/types";
import { ShareWorkDialog } from "../components/collaboration/ShareWorkDialog";
import { JoinSharedWorkDialog } from "../components/collaboration/JoinSharedWorkDialog";
import type { ParticipantRecoveryCandidate } from "../collaboration/webrtc/participantCheckpoint";
import { CoworkDisconnectionDialog } from "../components/collaboration/CoworkDisconnectionDialog";
import { CoworkClosedScreen } from "../components/collaboration/CoworkClosedScreen";
import { CoworkReadOnlySnapshotNotice } from "../components/collaboration/CoworkReadOnlySnapshotNotice";
import { ExportDialog } from "../components/layout/ExportDialog";
import { GuidedTourTrigger } from "../components/guidedTour/GuidedTourTrigger";
import { applyAutomaticMaturity, defaultModelDescription } from "../features/modeling/maturity";
import { buildRefinementPlacements } from "../features/modeling/refinement";
import { LocalSessionLeaveDialog } from "../components/collaboration/LocalSessionLeaveDialog";
import { AiAssistantProvider } from "../components/ai/AiAssistantProvider";
import { useI18n } from "../i18n/I18nProvider";
import { translateText } from "../i18n/translations";

type ModelingWorkspacePageProps = { initialInvitationToken?: string; initialParticipantRecovery?: ParticipantRecoveryCandidate<ModelSeed> };

export function ModelingWorkspacePage({ initialInvitationToken, initialParticipantRecovery }: ModelingWorkspacePageProps) {
  const { locale } = useI18n();
  const {
    me,
    seeds,
    canvases,
    placements,
    relationships,
    relationshipReferences,
    domains,
    domainCategories,
    namingPolicy,
    exportSettings,
    vocabularyEntries,
    dfd,
    annotations,
    users,
    locks,
    connected,
    isHost,
    nativeFileSystemAvailable,
    projects,
    activeProject,
    recoveryStatus,
    sharing,
    participantRecovery,
    participantSnapshotReadOnly,
    isLocalTabParticipant,
    localTabConnectionError,
    leaveLocalTabSession,
    viewParticipantSnapshot,
    abandonParticipantRecovery,
    loadOpfsProject,
    createOpfsProject,
    createProjectFromState,
    importProjectAsNew,
    openNativeProjectAsNew,
    saveOpfsProjectAs,
    renameOpfsProject,
    deleteOpfsProject,
    saveProject,
    openProject,
    exportProject,
    createExportSnapshot,
    importProject,
    rename,
    changeCanvas,
    updateAnnotationPresence,
    updateModelEditingPresence,
    moveCursor,
    lock,
    unlock,
    lockAll,
    unlockAll,
    saveSeed,
    saveCanvas,
    saveDfd,
    saveCatalogSeed,
    savePlacement,
    removeModel,
    transferOwnership,
    saveRelationship,
    saveRefinement,
    saveDomain,
    saveDomainCategory,
    saveNamingPolicy,
    saveExportSettings,
    saveVocabularyEntry,
    saveAnnotation,
    setLocalSeeds,
    setLocalCanvases,
    setLocalDfd,
    setLocalPlacements,
    setLocalRelationships,
    setLocalDomains,
    setLocalDomainCategories,
    setLocalVocabularyEntries,
    setLocalAnnotations
  } = useCollaboration<ModelSeed>([], [], [], initialDomains, initialDomainCategories, { initialInvitationToken, initialParticipantRecovery });
  const fileSystemAvailable = typeof window !== "undefined" && typeof window.showDirectoryPicker === "function";
  const [query, setQuery] = useState("");
  const [coworkClosed, setCoworkClosed] = useState(false);
  const [localLeaveDialogOpen, setLocalLeaveDialogOpen] = useState(false);
  const [workspaceMode, setWorkspaceMode] = useState<"erd" | "dfd">("erd");
  const [workspaceStarted, setWorkspaceStarted] = useState(() => Boolean(initialInvitationToken || initialParticipantRecovery));
  const [startDialogOpen, setStartDialogOpen] = useState(() => !initialInvitationToken && !initialParticipantRecovery);
  const [canvasSelectionRequired, setCanvasSelectionRequired] = useState(false);
  const [cardDisplayMode, setCardDisplayMode] = useState<CardDisplayMode>("description");
  const [nameDisplayMode, setNameDisplayMode] = useState<NameDisplayMode>("business");
  const [vocabularyOpen, setVocabularyOpen] = useState(false);
  const [vocabularyFocusKey, setVocabularyFocusKey] = useState<string | null>(null);
  const [activeCanvasId, setActiveCanvasId] = useState("main");
  const [activeDfdCanvasId, setActiveDfdCanvasId] = useState("dfd-main");
  const [canvasSelectorOpen, setCanvasSelectorOpen] = useState(false);
  const [modelCatalogOpen, setModelCatalogOpen] = useState(false);
  const [crudMatrixOpen, setCrudMatrixOpen] = useState(false);
  const [projectManagerOpen, setProjectManagerOpen] = useState(false);
  const [exportDialog, setExportDialog] = useState<{ snapshot: string; cardDisplayMode: CardDisplayMode } | null>(null);
  const [ownershipTransferSeedId, setOwnershipTransferSeedId] = useState<string | null>(null);
  const [viewport, setViewport] = useState<Viewport>({ x: 260, y: 140, scale: 1 });
  const [dragState, setDragState] = useState<DragState>(null);
  const [selectedId, setSelectedId] = useState("");
  const [editingRelationship, setEditingRelationship] = useState<{ relationship: Relationship; create: boolean } | null>(null);
  const [domainDictionaryContext, setDomainDictionaryContext] = useState<{ seedId?: string; fieldId?: string; label?: string } | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const historyRef = useRef<Record<string, { x: number; y: number }>[] >([]);
  const { cache: vocabularyCache, indexing: vocabularyIndexing } = useVocabularyMatchCache(seeds, domains, vocabularyEntries, namingPolicy);

  const activePlacements = useMemo(() => placements.filter((placement) => placement.canvasId === activeCanvasId), [activeCanvasId, placements]);
  const canvasSeeds = useMemo(() => activePlacements.flatMap((placement) => {
    const seed = seeds.find((candidate) => candidate.id === placement.seedId);
    const preview = dragState?.type === "seed" ? dragState.previewPositions[placement.seedId] : undefined;
    return seed ? [{ ...seed, x: preview?.x ?? placement.x, y: preview?.y ?? placement.y }] : [];
  }), [activePlacements, dragState, seeds]);
  const activeSeedIds = useMemo(() => new Set(canvasSeeds.map((seed) => seed.id)), [canvasSeeds]);
  const canvasRelationships = useMemo(() => relationships.filter((relationship) => activeSeedIds.has(relationship.sourceId) && activeSeedIds.has(relationship.targetId)), [activeSeedIds, relationships]);
  const canvasCardWidths = useMemo(() => Object.fromEntries(canvasSeeds.map((seed) => [
    seed.id,
    getModelCardWidth(
      getCachedDisplayName(vocabularyCache, `table:${seed.id}`, seed.title, seed.names, nameDisplayMode),
      flattenLabels(seed).map((tag) => translateText(tag === seed.dependency ? dependencyLabels[seed.dependency] : tag, locale))
    )
  ])), [canvasSeeds, locale, nameDisplayMode, vocabularyCache]);
  const canvasDescriptionHeights = useMemo(() => Object.fromEntries(canvasSeeds.map((seed) => [
    seed.id,
    getModelDescriptionCardHeight(seed.description, canvasCardWidths[seed.id])
  ])), [canvasCardWidths, canvasSeeds]);
  const canvasCardHeights = useMemo(() => Object.fromEntries(canvasSeeds.map((seed) => [
    seed.id,
    cardDisplayMode === "description" ? canvasDescriptionHeights[seed.id] : cardHeight
  ])), [canvasDescriptionHeights, canvasSeeds, cardDisplayMode]);

  const visibleSeeds = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return canvasSeeds;
    return canvasSeeds.filter((seed) =>
      [seed.title, ...(["business", "system", "physical"] as NameDisplayMode[]).map((mode) => getCachedDisplayName(vocabularyCache, `table:${seed.id}`, seed.title, seed.names, mode)), seed.description, String(seed.maturedLevel), ...flattenLabels(seed), ...(seed.fields ?? []).flatMap((field) => (["business", "system", "physical"] as NameDisplayMode[]).map((mode) => getCachedDisplayName(vocabularyCache, `field:${seed.id}:${field.id}`, getFieldEffectiveName(field, domains, mode), field.names, mode)))].some((value) =>
        value.toLowerCase().includes(normalized)
      )
    );
  }, [canvasSeeds, domains, query, vocabularyCache]);

  const selectedSeed = useMemo(() => canvasSeeds.find((seed) => seed.id === selectedId) ?? canvasSeeds[0], [canvasSeeds, selectedId]);
  const selectedPlacement = useMemo(() => activePlacements.find((placement) => placement.seedId === selectedSeed?.id), [activePlacements, selectedSeed?.id]);
  const selectedOwner = selectedSeed ? locks[selectedSeed.id] : undefined;
  const canEditSelected = !participantSnapshotReadOnly && !!selectedSeed && selectedPlacement?.accessMode === "owner" && selectedOwner?.id === me.id;
  const remoteUsers = useMemo(
    () => users.filter((user) => user.id !== me.id && user.canvasId === activeCanvasId && (user.x !== 0 || user.y !== 0)),
    [activeCanvasId, me.id, users]
  );

  useEffect(() => {
    if (canvases.some((canvas) => canvas.id === activeCanvasId)) return;
    const fallback = canvases[0]?.id;
    if (fallback) setActiveCanvasId(fallback);
  }, [activeCanvasId, canvases]);

  const unlockOwnedExcept = useCallback(
    async (keepSeedIds: string[]) => {
      const keep = new Set(keepSeedIds);
      const seedIds = Object.entries(locks)
        .filter(([seedId, owner]) => owner.id === me.id && !keep.has(seedId))
        .map(([seedId]) => seedId);
      if (seedIds.length > 0) await unlockAll(seedIds);
    },
    [locks, me.id, unlockAll]
  );

  const updateSeed = useCallback(
    (seedId: string, patch: Partial<ModelSeed>) => {
      if (activePlacements.find((placement) => placement.seedId === seedId)?.accessMode !== "owner") return;
      const patchedSeeds = seeds.map((seed) => (seed.id === seedId ? { ...seed, ...patch } : seed));
      const nextSeeds = applyAutomaticMaturity(patchedSeeds, domains, vocabularyEntries);
      const nextSeed = nextSeeds.find((seed) => seed.id === seedId);
      setLocalSeeds(nextSeeds);
      if (nextSeed) void saveSeed(nextSeed, false, activeCanvasId);
    },
    [activeCanvasId, activePlacements, domains, saveSeed, seeds, setLocalSeeds, vocabularyEntries]
  );

  const handleModelEditingChange = useCallback((seedId: string, editing: boolean) => {
    void updateModelEditingPresence(editing ? seedId : "");
  }, [updateModelEditingPresence]);

  const createDomain = useCallback(
    async (name: string, categoryId = "user-defined") => {
      const normalized = name.trim();
      if (!normalized) return;
      const domain: DataDomain = {
        id: crypto.randomUUID(),
        name: normalized,
        categoryId,
        shape: "unresolved",
        components: []
      };
      if (await saveDomain(domain, { create: true })) {
        setLocalDomains([...domains, domain]);
      } else {
        window.alert("The domain could not be created. Domain names must be unique.");
      }
    },
    [domains, saveDomain, setLocalDomains]
  );

  const createDomainCategory = useCallback(
    async (name: string) => {
      const normalized = name.trim();
      if (!normalized) return;
      const category: DomainCategory = { id: crypto.randomUUID(), name: normalized };
      if (await saveDomainCategory(category, true)) {
        setLocalDomainCategories([...domainCategories, category]);
      } else {
        window.alert("The category could not be created. Category names must be unique.");
      }
    },
    [domainCategories, saveDomainCategory, setLocalDomainCategories]
  );

  const changeDomainCategory = useCallback(
    async (category: DomainCategory) => {
      if (await saveDomainCategory(category)) {
        setLocalDomainCategories(domainCategories.map((item) => (item.id === category.id ? category : item)));
      } else {
        window.alert("The category could not be renamed. Category names must be unique.");
      }
    },
    [domainCategories, saveDomainCategory, setLocalDomainCategories]
  );

  const importDomainCategory = useCallback(
    async (bundle: DomainCategoryBundle) => {
      const occupiedCategoryNames = new Set(domainCategories.map((item) => item.name.toLowerCase()));
      const baseCategoryName = bundle.category.name.trim();
      let categoryName = baseCategoryName;
      for (let suffix = 2; occupiedCategoryNames.has(categoryName.toLowerCase()); suffix += 1) categoryName = `${baseCategoryName} ${suffix}`;
      const category: DomainCategory = { id: crypto.randomUUID(), name: categoryName };
      if (!(await saveDomainCategory(category, true))) {
        window.alert("The category could not be imported.");
        return;
      }

      const idMap = new Map(bundle.domains.map((domain) => [domain.id, crypto.randomUUID()]));
      const occupiedDomainNames = new Set(domains.map((item) => item.name.toLowerCase()));
      const imported: DataDomain[] = [];
      const orderedDomains = [...bundle.domains].sort((left, right) => Number(left.shape === "composite") - Number(right.shape === "composite"));
      for (const source of orderedDomains) {
        const baseName = source.name.trim() || "Imported domain";
        let name = baseName;
        for (let suffix = 2; occupiedDomainNames.has(name.toLowerCase()); suffix += 1) name = `${baseName} ${suffix}`;
        occupiedDomainNames.add(name.toLowerCase());
        const domain: DataDomain = {
          ...source,
          id: idMap.get(source.id) ?? crypto.randomUUID(),
          name,
          categoryId: category.id,
          system: false,
          shape: source.shape === "primitive" ? "scalar" : source.shape,
          components: source.components.map((component) => ({
            ...component,
            id: crypto.randomUUID(),
            domainId: component.domainId ? idMap.get(component.domainId) ?? component.domainId : undefined
          }))
        };
        if (!(await saveDomain(domain, { create: true }))) {
          window.alert(`The category was created, but domain “${name}” could not be imported.`);
          break;
        }
        imported.push(domain);
      }
      startTransition(() => {
        setLocalDomainCategories([...domainCategories, category]);
        setLocalDomains([...domains, ...imported]);
      });
    },
    [domainCategories, domains, saveDomain, saveDomainCategory, setLocalDomainCategories, setLocalDomains]
  );

  const changeDomain = useCallback(
    async (domain: DataDomain) => {
      if (await saveDomain(domain)) {
        setLocalDomains(domains.map((item) => (item.id === domain.id ? domain : item)));
      } else {
        window.alert("The domain could not be updated. Check that names are non-empty and unique, and that component types are undefined, primitive, or single-field domains.");
      }
    },
    [domains, saveDomain, setLocalDomains]
  );

  const deleteDomain = useCallback(
    async (domain: DataDomain) => {
      if (!window.confirm(`Delete domain \"${domain.name}\"? Domains assigned to fields cannot be deleted.`)) return;
      if (await saveDomain(domain, { delete: true })) {
        setLocalDomains(domains.filter((item) => item.id !== domain.id));
      } else {
        window.alert("The domain is still assigned to a field or cannot be deleted.");
      }
    },
    [domains, saveDomain, setLocalDomains]
  );

  const openDomainDictionary = useCallback(
    (seedId?: string, fieldId?: string) => {
      const seed = seedId ? seeds.find((item) => item.id === seedId) : undefined;
      const field = seed && fieldId ? seed.fields.find((item) => item.id === fieldId) : undefined;
      setDomainDictionaryContext({ seedId: field ? seedId : undefined, fieldId: field?.id, label: field?.name });
    },
    [seeds]
  );

  const closeDomainDictionary = useCallback(() => {
    setDomainDictionaryContext(null);
  }, []);

  const assignDomainFromDictionary = useCallback(
    (domainId: string) => {
      if (!domainDictionaryContext?.seedId || !domainDictionaryContext.fieldId) return;
      const seed = seeds.find((item) => item.id === domainDictionaryContext.seedId);
      if (!seed) return;
      updateSeed(seed.id, { fields: seed.fields.map((field) => (field.id === domainDictionaryContext.fieldId ? { ...field, domainId } : field)) });
    },
    [domainDictionaryContext, seeds, updateSeed]
  );

  const saveRelationshipChange = useCallback(
    async (relationship: Relationship, create = false) => {
      const existingReference = getRelationshipReference(relationshipReferences, relationship.id);
      const reference: RelationshipReference = existingReference ?? {
        id: `${relationship.id}-reference`,
        relationshipId: relationship.id,
        primaryKey: false,
        foreignKey: false,
        hiddenOnModelIds: []
      };
      const nextRelationships = create ? [...relationships, relationship] : relationships.map((item) => (item.id === relationship.id ? relationship : item));
      const nextReferences = existingReference ? relationshipReferences : [...relationshipReferences, reference];
      const saved = await saveRelationship(relationship, reference, { create });
      if (saved) {
        setLocalRelationships(nextRelationships, nextReferences);
        setEditingRelationship(null);
        await unlockOwnedExcept([relationship.sourceId]);
      } else {
        window.alert("The relationship could not be saved. Check that both models are still locked by you.");
      }
    },
    [relationshipReferences, relationships, saveRelationship, setLocalRelationships, unlockOwnedExcept]
  );

  const closeRelationshipEditor = useCallback(() => {
    if (editingRelationship) void unlockOwnedExcept([editingRelationship.relationship.sourceId]);
    setEditingRelationship(null);
  }, [editingRelationship, unlockOwnedExcept]);

  const deleteRelationship = useCallback(
    async (relationship: Relationship) => {
      const reference = getRelationshipReference(relationshipReferences, relationship.id) ?? {
        id: `${relationship.id}-reference`, relationshipId: relationship.id, primaryKey: false, foreignKey: false, hiddenOnModelIds: []
      };
      if (!(await lockAll([relationship.sourceId, relationship.targetId]))) return;
      if (await saveRelationship(relationship, reference, { delete: true })) {
        setLocalRelationships(
          relationships.filter((item) => item.id !== relationship.id),
          relationshipReferences.filter((item) => item.relationshipId !== relationship.id)
        );
        setEditingRelationship(null);
      } else {
        window.alert("The relationship could not be deleted because its current state is locked or invalid.");
      }
    },
    [lockAll, relationshipReferences, relationships, saveRelationship, setLocalRelationships]
  );

  const updateRelationshipReference = useCallback(
    async (relationshipId: string, patch: Partial<RelationshipReference>) => {
      const relationship = relationships.find((item) => item.id === relationshipId);
      const reference = getRelationshipReference(relationshipReferences, relationshipId);
      if (!relationship || !reference) return;
      if (!(await lockAll([relationship.sourceId, relationship.targetId]))) return;
      const nextReference = { ...reference, ...patch };
      if (await saveRelationship(relationship, nextReference)) {
        setLocalRelationships(relationships, relationshipReferences.map((item) => (item.id === reference.id ? nextReference : item)));
      } else {
        window.alert("The relationship reference could not be saved.");
      }
    },
    [lockAll, relationshipReferences, relationships, saveRelationship, setLocalRelationships]
  );

  const screenToWorld = useCallback(
    (clientX: number, clientY: number) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return {
        x: (clientX - rect.left - viewport.x) / viewport.scale,
        y: (clientY - rect.top - viewport.y) / viewport.scale
      };
    },
    [viewport]
  );

  const cursorToWorld = useCallback(
    (clientX: number, clientY: number) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return screenToWorld(
        Math.min(rect.right - 1, Math.max(rect.left + 1, clientX)),
        Math.min(rect.bottom - 1, Math.max(rect.top + 1, clientY))
      );
    },
    [screenToWorld]
  );

  const findErdAnnotationAnchor = useCallback((point: CanvasPoint): AnnotationAnchor | undefined => {
    const seed = [...canvasSeeds].reverse().find((item) => point.x >= item.x && point.x <= item.x + canvasCardWidths[item.id] && point.y >= item.y && point.y <= item.y + canvasCardHeights[item.id]);
    return seed ? { x: point.x - seed.x, y: point.y - seed.y, itemId: seed.id, itemKind: "model" } : undefined;
  }, [canvasCardHeights, canvasCardWidths, canvasSeeds]);

  const resolveErdAnnotationAnchor = useCallback((anchor: AnnotationAnchor): CanvasPoint => {
    if (anchor.itemKind !== "model" || !anchor.itemId) return anchor;
    const seed = canvasSeeds.find((item) => item.id === anchor.itemId);
    return seed ? { x: seed.x + anchor.x, y: seed.y + anchor.y } : anchor;
  }, [canvasSeeds]);

  const annotationController = useCanvasAnnotations({
    canvasType: "erd",
    canvasId: activeCanvasId,
    annotations,
    me,
    screenToWorld,
    findAnchor: findErdAnnotationAnchor,
    saveAnnotation,
    setLocalAnnotations,
    updatePresence: updateAnnotationPresence
  });
  const clearErdAnnotationSelection = annotationController.clearSelection;
  useEffect(() => {
    if (workspaceMode === "dfd") clearErdAnnotationSelection();
  }, [clearErdAnnotationSelection, workspaceMode]);

  const quickCreateSeed = useCallback(
    async (name: string) => {
      const index = seeds.length + 1;
      const point = { x: 120 + index * 24, y: 120 + index * 18 };
      const seed: ModelSeed = {
        id: crypto.randomUUID(),
        title: name.trim(),
        description: defaultModelDescription,
        fields: [],
        x: point.x,
        y: point.y,
        role: "transaction",
        volumeEstimate: defaultVolumeEstimate("transaction"),
        dependency: "independent",
        hasPrivacy: false,
        maturedLevel: 6,
        rotation: index % 2 === 0 ? 0.6 : -0.6
      };

      setSelectedId(seed.id);
      setNameDisplayMode("business");
      startTransition(() => {
        setLocalSeeds([...seeds, seed]);
        setLocalPlacements([...placements, { canvasId: activeCanvasId, seedId: seed.id, x: point.x, y: point.y, accessMode: "owner" }]);
      });

      if (await saveSeed(seed, true, activeCanvasId)) {
        await unlockOwnedExcept([seed.id]);
        await lock(seed.id);
      }
    },
    [activeCanvasId, lock, placements, saveSeed, seeds, setLocalPlacements, setLocalSeeds, unlockOwnedExcept]
  );

  const updateScale = useCallback(
    (nextScale: number, anchor?: { clientX: number; clientY: number }) => {
      const scale = clampScale(nextScale);
      if (!anchor || !canvasRef.current) {
        setViewport((current) => ({ ...current, scale }));
        return;
      }

      const rect = canvasRef.current.getBoundingClientRect();
      const worldX = (anchor.clientX - rect.left - viewport.x) / viewport.scale;
      const worldY = (anchor.clientY - rect.top - viewport.y) / viewport.scale;
      setViewport({
        scale,
        x: anchor.clientX - rect.left - worldX * scale,
        y: anchor.clientY - rect.top - worldY * scale
      });
    },
    [viewport]
  );

  const handleWheel = useCallback(
    (event: WheelEvent) => {
      event.preventDefault();
      if (event.ctrlKey || event.metaKey) {
        updateScale(viewport.scale * (event.deltaY > 0 ? 0.9 : 1.1), {
          clientX: event.clientX,
          clientY: event.clientY
        });
        return;
      }
      setViewport((current) => ({
        ...current,
        x: current.x - event.deltaX,
        y: current.y - event.deltaY
      }));
    },
    [updateScale, viewport.scale]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  const handleCanvasPointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (annotationController.handleCanvasPointerDown(event)) return;
      if ((event.target as HTMLElement).closest("article, button, input, textarea, [data-no-pan='true']")) return;
      annotationController.clearSelection();
      event.currentTarget.setPointerCapture(event.pointerId);
      setDragState({
        type: "pan",
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        origin: viewport
      });
    },
    [annotationController, viewport]
  );

  const handleSeedPointerDown = useCallback(
    async (event: PointerEvent<HTMLElement>, seed: ModelSeed) => {
      event.stopPropagation();
      annotationController.clearSelection();
      const placement = activePlacements.find((item) => item.seedId === seed.id);
      const owner = locks[seed.id];
      setSelectedId(seed.id);
      const target = event.target as HTMLElement;
      const noDrag = !!target.closest("[data-no-drag='true']");
      const point = screenToWorld(event.clientX, event.clientY);
      if (placement?.accessMode !== "owner") {
        if (noDrag) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        const origins = { [seed.id]: { x: seed.x, y: seed.y } };
        setDragState({
          type: "seed",
          pointerId: event.pointerId,
          seedId: seed.id,
          offsetX: point.x - seed.x,
          offsetY: point.y - seed.y,
          seedIds: [seed.id],
          origins,
          previewPositions: origins,
          groupLocked: true,
          ready: true
        });
        return;
      }
      if (owner && owner.id !== me.id) return;
      const relatedSeedIDs = getRelatedDragSeedIDs(seed, canvasSeeds, canvasRelationships, relationshipReferences);
      const origins = Object.fromEntries(canvasSeeds.filter((item) => relatedSeedIDs.includes(item.id)).map((item) => [item.id, { x: item.x, y: item.y }]));
      if (!noDrag) {
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
          return;
        }
        setDragState({
          type: "seed",
          pointerId: event.pointerId,
          seedId: seed.id,
          offsetX: point.x - seed.x,
          offsetY: point.y - seed.y,
          seedIds: relatedSeedIDs,
          origins,
          previewPositions: origins,
          groupLocked: false,
          ready: false
        });
      }
      await unlockOwnedExcept([seed.id]);
      if (!owner && !(await lock(seed.id))) {
        if (!noDrag && event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
        return;
      }
      if (noDrag) {
        if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) target.focus();
        return;
      }
      setDragState((current) => current?.type === "seed" && current.pointerId === event.pointerId
        ? { ...current, groupLocked: relatedSeedIDs.length === 1, ready: true }
        : current);
    },
    [activePlacements, annotationController, canvasRelationships, canvasSeeds, lock, locks, me.id, relationshipReferences, screenToWorld, unlockOwnedExcept]
  );

  const handleRelationshipPointerDown = useCallback(
    async (event: PointerEvent<HTMLButtonElement>, seed: ModelSeed) => {
      event.preventDefault();
      event.stopPropagation();
      const point = screenToWorld(event.clientX, event.clientY);
      canvasRef.current?.setPointerCapture(event.pointerId);
      setDragState({ type: "relationship", pointerId: event.pointerId, sourceId: seed.id, x: point.x, y: point.y });
      await unlockOwnedExcept([seed.id]);
    },
    [screenToWorld, unlockOwnedExcept]
  );

  const handlePointerMove = useCallback(
    async (event: PointerEvent<HTMLDivElement>) => {
      const cursor = cursorToWorld(event.clientX, event.clientY);
      moveCursor(cursor.x, cursor.y);
      if (annotationController.handleCanvasPointerMove(event)) return;
      if (!dragState || dragState.pointerId !== event.pointerId) return;

      if (dragState.type === "pan") {
        setViewport({
          ...dragState.origin,
          x: dragState.origin.x + event.clientX - dragState.startX,
          y: dragState.origin.y + event.clientY - dragState.startY
        });
        return;
      }

      if (dragState.type === "relationship") {
        const point = screenToWorld(event.clientX, event.clientY);
        setDragState({ ...dragState, x: point.x, y: point.y });
        return;
      }

      if (!dragState.ready) return;

      if (!dragState.groupLocked) {
        if (await lockAll(dragState.seedIds)) {
          setDragState({ ...dragState, groupLocked: true });
        } else {
          setDragState(null);
        }
        return;
      }

      const point = screenToWorld(event.clientX, event.clientY);
      const origin = dragState.origins[dragState.seedId];
      const deltaX = point.x - dragState.offsetX - origin.x;
      const deltaY = point.y - dragState.offsetY - origin.y;
      const previewPositions = Object.fromEntries(dragState.seedIds.map((seedId) => [seedId, {
        x: dragState.origins[seedId].x + deltaX,
        y: dragState.origins[seedId].y + deltaY
      }]));
      setDragState({ ...dragState, previewPositions });
    },
    [annotationController, cursorToWorld, dragState, lockAll, moveCursor, screenToWorld]
  );

  const handlePointerLeave = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const cursor = cursorToWorld(event.clientX, event.clientY);
      moveCursor(cursor.x, cursor.y);
    },
    [cursorToWorld, moveCursor]
  );

  const stopDragging = useCallback(
    async (event: PointerEvent<HTMLDivElement>) => {
      if (annotationController.handleCanvasPointerUp(event)) return;
      if (!dragState || dragState.pointerId !== event.pointerId) return;
      if (dragState.type === "relationship") {
        const point = screenToWorld(event.clientX, event.clientY);
        const target = getRelationshipDropTarget(dragState.sourceId, point, canvasSeeds, canvasCardWidths, canvasCardHeights);
        if (target && (await lockAll([dragState.sourceId, target.id]))) {
          setEditingRelationship({
            create: true,
            relationship: {
              id: crypto.randomUUID(), name: "", sourceId: dragState.sourceId, targetId: target.id,
              sourceMultiplicity: "1", targetMultiplicity: "0..*", direction: "source-to-target", kind: "foreign-key"
            }
          });
        }
      }
      if (dragState.type === "seed") {
        const cancelled = event.type === "pointercancel";
        const changed = dragState.seedIds.some((seedId) => {
          const before = dragState.origins[seedId];
          const after = dragState.previewPositions[seedId];
          return before && after && (before.x !== after.x || before.y !== after.y);
        });
        if (!cancelled && dragState.ready && dragState.groupLocked && changed) {
          const nextPlacements = placements.map((placement) => {
            const preview = placement.canvasId === activeCanvasId ? dragState.previewPositions[placement.seedId] : undefined;
            return preview ? { ...placement, ...preview } : placement;
          });
          setLocalPlacements(nextPlacements);
          let allSaved = true;
          for (const placement of nextPlacements.filter((item) => item.canvasId === activeCanvasId && dragState.seedIds.includes(item.seedId))) {
            if (!(await savePlacement(placement))) allSaved = false;
          }
          if (allSaved) historyRef.current.push(dragState.origins);
          else window.alert("The model position change could not be synchronized.");
        }
        if (dragState.groupLocked) await unlockAll(dragState.seedIds.filter((seedId) => seedId !== dragState.seedId));
      }
      setDragState(null);
    },
    [activeCanvasId, annotationController, canvasCardHeights, canvasCardWidths, canvasSeeds, dragState, lockAll, placements, savePlacement, screenToWorld, setLocalPlacements, unlockAll]
  );

  const handleEditRelationship = useCallback(
    async (relationshipId: string) => {
      const relationship = relationships.find((item) => item.id === relationshipId);
      if (relationship && (await lockAll([relationship.sourceId, relationship.targetId]))) {
        setEditingRelationship({ relationship, create: false });
      }
    },
    [lockAll, relationships]
  );

  useEffect(() => {
    const handleUndo = (event: KeyboardEvent) => {
      if (!event.metaKey && !event.ctrlKey) return;
      if (annotationController.selectedId) return;
      if (event.key.toLowerCase() !== "z" || (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)) return;
      const origins = historyRef.current.pop();
      if (!origins) return;
      event.preventDefault();
      const seedIDs = Object.keys(origins);
      void (async () => {
        if (!(await lockAll(seedIDs))) return;
        const nextPlacements = placements.map((placement) => placement.canvasId === activeCanvasId && origins[placement.seedId] ? { ...placement, ...origins[placement.seedId] } : placement);
        setLocalPlacements(nextPlacements);
        for (const placement of nextPlacements.filter((placement) => placement.canvasId === activeCanvasId && origins[placement.seedId])) await savePlacement(placement);
        await unlockAll(seedIDs);
      })();
    };
    window.addEventListener("keydown", handleUndo);
    return () => window.removeEventListener("keydown", handleUndo);
  }, [activeCanvasId, annotationController.selectedId, lockAll, placements, savePlacement, setLocalPlacements, unlockAll]);

  const resetView = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || canvasSeeds.length === 0) {
      setViewport({ x: 260, y: 140, scale: 1 });
      return;
    }
    const bounds = canvas.getBoundingClientRect();
    const minX = Math.min(...canvasSeeds.map((seed) => seed.x));
    const minY = Math.min(...canvasSeeds.map((seed) => seed.y));
    const maxX = Math.max(...canvasSeeds.map((seed) => seed.x + canvasCardWidths[seed.id]));
    const maxY = Math.max(...canvasSeeds.map((seed) => seed.y + canvasCardHeights[seed.id]));
    setViewport({
      x: bounds.width / 2 - (minX + maxX) / 2,
      y: bounds.height / 2 - (minY + maxY) / 2,
      scale: 1
    });
  }, [canvasCardHeights, canvasCardWidths, canvasSeeds]);

  const applyRefinement = useCallback(async (result: RefinementResult, targetCanvasId?: string) => {
    const existingSeedIds = new Set(seeds.map((seed) => seed.id));
    const existingRelationshipIds = new Set(relationships.map((item) => item.id));
    const requiredLocks = new Set(result.seeds.filter((seed) => existingSeedIds.has(seed.id) && JSON.stringify(seed) !== JSON.stringify(seeds.find((item) => item.id === seed.id))).map((seed) => seed.id));
    for (const item of result.relationships.filter((relationship) => !existingRelationshipIds.has(relationship.id))) {
      if (existingSeedIds.has(item.sourceId)) requiredLocks.add(item.sourceId);
      if (existingSeedIds.has(item.targetId)) requiredLocks.add(item.targetId);
    }
    for (const item of result.relationships.filter((relationship) => existingRelationshipIds.has(relationship.id) && JSON.stringify(relationship) !== JSON.stringify(relationships.find((current) => current.id === relationship.id)))) {
      const current = relationships.find((relationship) => relationship.id === item.id)!;
      for (const seedId of [current.sourceId, current.targetId, item.sourceId, item.targetId]) if (existingSeedIds.has(seedId)) requiredLocks.add(seedId);
    }
    if (requiredLocks.size > 0 && !(await lockAll([...requiredLocks]))) return false;
    const sourceOwner = placements.find((placement) => placement.seedId === result.sourceSeedId && placement.accessMode === "owner");
    const ownerCanvasId = sourceOwner?.canvasId ?? targetCanvasId;
    if (result.createdSeedIds.length > 0 && !ownerCanvasId) {
      window.alert("Select an ERD canvas that will own the new model.");
      return false;
    }
    const appliedResult = {
      ...result,
      createdPlacements: ownerCanvasId ? buildRefinementPlacements(result, ownerCanvasId, placements) : []
    };
    if (!(await saveRefinement(appliedResult))) return false;
    startTransition(() => {
      setLocalSeeds(appliedResult.seeds);
      setLocalPlacements([...placements, ...appliedResult.createdPlacements]);
      setLocalRelationships(appliedResult.relationships, appliedResult.relationshipReferences);
      setLocalDomains(appliedResult.domains);
    });
    return true;
  }, [lockAll, placements, relationships, saveRefinement, seeds, setLocalDomains, setLocalPlacements, setLocalRelationships, setLocalSeeds]);

  const createVocabularyEntry = useCallback(async (entry: VocabularyEntry) => {
    if (!(await saveVocabularyEntry(entry, { create: true }))) {
      window.alert("The term conflicts with an earlier business name or alias, or is invalid. Earlier definitions take priority.");
      return false;
    }
    setLocalVocabularyEntries((current) => current.some((item) => item.id === entry.id) ? current : [...current, entry]);
    return true;
  }, [saveVocabularyEntry, setLocalVocabularyEntries]);

  const changeVocabularyEntry = useCallback(async (entry: VocabularyEntry) => {
    if (!(await saveVocabularyEntry(entry))) {
      window.alert("The vocabulary entry could not be updated. Business names and aliases must not duplicate an earlier definition.");
      return false;
    }
    setLocalVocabularyEntries((current) => current.map((item) => item.id === entry.id ? entry : item));
    return true;
  }, [saveVocabularyEntry, setLocalVocabularyEntries]);

  const deleteVocabularyEntry = useCallback(async (entry: VocabularyEntry) => {
    if (!(await saveVocabularyEntry(entry, { delete: true }))) return false;
    setLocalVocabularyEntries((current) => current.filter((item) => item.id !== entry.id));
    return true;
  }, [saveVocabularyEntry, setLocalVocabularyEntries]);

  const changeVocabularyBinding = useCallback(async (match: VocabularyMatch, binding: VocabularyBinding) => {
    if (match.target === "domain") {
      const domain = domains.find((item) => item.id === match.ownerId);
      if (!domain) return false;
      await changeDomain({ ...domain, vocabularyBinding: binding });
      return true;
    }
    const seed = seeds.find((item) => item.id === match.ownerId);
    if (!seed) return false;
    if (locks[seed.id]?.id !== me.id && !(await lock(seed.id))) {
      window.alert(`The model “${seed.title}” must be unlocked before its vocabulary binding can be changed.`);
      return false;
    }
    if (match.target === "table") updateSeed(seed.id, { vocabularyBinding: binding });
    else updateSeed(seed.id, { fields: seed.fields.map((field) => field.id === match.fieldId ? { ...field, vocabularyBinding: binding } : field) });
    return true;
  }, [changeDomain, domains, lock, locks, me.id, seeds, updateSeed]);

  const replaceVocabularyAlias = useCallback(async (match: VocabularyMatch, segmentIndex: number) => {
    const businessName = replaceAliasInSource(match, segmentIndex);
    if (businessName === match.sourceText) return false;
    if (match.target === "domain") {
      const domain = domains.find((item) => item.id === match.ownerId);
      if (!domain) return false;
      await changeDomain({ ...domain, names: updateNameSet(domain.name, domain.names, "business", businessName), vocabularyBinding: undefined });
      return true;
    }
    const seed = seeds.find((item) => item.id === match.ownerId);
    if (!seed) return false;
    if (locks[seed.id]?.id !== me.id && !(await lock(seed.id))) {
      window.alert(`The model “${seed.title}” must be unlocked before its name can be corrected.`);
      return false;
    }
    if (match.target === "table") {
      updateSeed(seed.id, { names: updateNameSet(seed.title, seed.names, "business", businessName), vocabularyBinding: undefined });
    } else {
      updateSeed(seed.id, { fields: seed.fields.map((field) => field.id === match.fieldId ? { ...field, names: updateNameSet(field.name, field.names, "business", businessName), vocabularyBinding: undefined } : field) });
    }
    return true;
  }, [changeDomain, domains, lock, locks, me.id, seeds, updateSeed]);

  const openVocabulary = useCallback(() => { setVocabularyFocusKey(null); setVocabularyOpen(true); }, []);
  const openVocabularyAt = useCallback((matchKey: string) => { setVocabularyFocusKey(matchKey); setVocabularyOpen(true); }, []);
  const openSidebarVocabulary = useCallback((matchKey?: string) => { if (matchKey) openVocabularyAt(matchKey); else openVocabulary(); }, [openVocabulary, openVocabularyAt]);
  const closeVocabulary = useCallback(() => { setVocabularyOpen(false); setVocabularyFocusKey(null); }, []);

  const selectCanvas = useCallback((canvasId: string, focusSeedId?: string) => {
    setActiveCanvasId(canvasId);
    setSelectedId(focusSeedId ?? placements.find((placement) => placement.canvasId === canvasId)?.seedId ?? "");
    const focusPlacement = focusSeedId ? placements.find((placement) => placement.canvasId === canvasId && placement.seedId === focusSeedId) : undefined;
    setViewport(focusPlacement ? { x: 360 - focusPlacement.x, y: 220 - focusPlacement.y, scale: 1 } : { x: 260, y: 140, scale: 1 });
    setCanvasSelectorOpen(false);
    setModelCatalogOpen(false);
    void changeCanvas(canvasId);
  }, [changeCanvas, placements]);

  const createCanvas = useCallback(async (name: string) => {
    const canvas: ErdCanvas = { id: crypto.randomUUID(), name };
    if (!(await saveCanvas(canvas, true))) {
      window.alert("The canvas could not be created. Canvas names must be unique.");
      return false;
    }
    setLocalCanvases([...canvases, canvas]);
    selectCanvas(canvas.id);
    return true;
  }, [canvases, saveCanvas, selectCanvas, setLocalCanvases]);

  const renameCanvas = useCallback(async (canvas: ErdCanvas) => {
    if (!(await saveCanvas(canvas))) {
      window.alert("The canvas could not be renamed. Canvas names must be unique.");
      return false;
    }
    setLocalCanvases(canvases.map((item) => item.id === canvas.id ? canvas : item));
    return true;
  }, [canvases, saveCanvas, setLocalCanvases]);

  const createDfdCanvas = useCallback(async (name: string) => {
    if (dfd.canvases.some((canvas) => canvas.name.toLowerCase() === name.toLowerCase())) return false;
    const canvas = { id: crypto.randomUUID(), name };
    const next = { ...dfd, canvases: [...dfd.canvases, canvas] };
    setLocalDfd(next);
    if (!(await saveDfd(next))) {
      window.alert("The DFD canvas could not be created.");
      return false;
    }
    setActiveDfdCanvasId(canvas.id);
    return true;
  }, [dfd, saveDfd, setLocalDfd]);

  const renameDfdCanvas = useCallback(async (canvas: { id: string; name: string }) => {
    if (dfd.canvases.some((item) => item.id !== canvas.id && item.name.toLowerCase() === canvas.name.toLowerCase())) return false;
    const next = { ...dfd, canvases: dfd.canvases.map((item) => item.id === canvas.id ? canvas : item) };
    setLocalDfd(next);
    if (!(await saveDfd(next))) {
      window.alert("The DFD canvas could not be renamed.");
      return false;
    }
    return true;
  }, [dfd, saveDfd, setLocalDfd]);

  const selectProjectCanvas = useCallback((kind: ProjectCanvasKind, canvasId: string) => {
    setCanvasSelectionRequired(false);
    if (kind === "erd") {
      setWorkspaceMode("erd");
      selectCanvas(canvasId);
      return;
    }
    setActiveDfdCanvasId(canvasId);
    setWorkspaceMode("dfd");
    setCanvasSelectorOpen(false);
  }, [selectCanvas]);
  const selectErdCanvas = useCallback((canvasId: string) => selectProjectCanvas("erd", canvasId), [selectProjectCanvas]);
  const createProjectCanvas = useCallback(async (kind: ProjectCanvasKind, name: string) => {
    if (kind === "erd") {
      const created = await createCanvas(name);
      if (created) {
        setWorkspaceMode("erd");
        setCanvasSelectionRequired(false);
      }
      return created;
    }
    const created = await createDfdCanvas(name);
    if (created) {
      setWorkspaceMode("dfd");
      setCanvasSelectionRequired(false);
      setCanvasSelectorOpen(false);
    }
    return created;
  }, [createCanvas, createDfdCanvas]);
  const renameProjectCanvas = useCallback((kind: ProjectCanvasKind, canvas: { id: string; name: string }) => kind === "erd" ? renameCanvas(canvas) : renameDfdCanvas(canvas), [renameCanvas, renameDfdCanvas]);
  const completeProjectSelection = useCallback(async (action: () => Promise<boolean>) => {
    const succeeded = await action();
    if (!succeeded) return false;
    startTransition(() => {
      setWorkspaceStarted(true);
      setStartDialogOpen(false);
      setProjectManagerOpen(false);
      setCanvasSelectionRequired(true);
      setCanvasSelectorOpen(true);
    });
    return true;
  }, []);
  const startFromTemplate = useCallback((id: StarterProjectId) => {
    const starter = starterProjects.find((candidate) => candidate.id === id);
    const displayName = id === "empty" ? "Untitled project" : `${starter?.title ?? "Starter"} starter`;
    return completeProjectSelection(() => createProjectFromState(displayName, createStarterProjectState(id)));
  }, [completeProjectSelection, createProjectFromState]);
  const startFromSavedProject = useCallback((projectId: string) => completeProjectSelection(() => loadOpfsProject(projectId)), [completeProjectSelection, loadOpfsProject]);
  const startFromUpload = useCallback((file: File) => completeProjectSelection(() => importProjectAsNew(file)), [completeProjectSelection, importProjectAsNew]);
  const startFromNativeFile = useCallback(() => completeProjectSelection(openNativeProjectAsNew), [completeProjectSelection, openNativeProjectAsNew]);
  const updateProjectDfd = useCallback((next: DfdState) => {
    setLocalDfd(next);
    void saveDfd(next).then((saved) => { if (!saved) window.alert("The CRUD Matrix change could not be saved."); });
  }, [saveDfd, setLocalDfd]);
  const openCrudMatrix = useCallback(() => setCrudMatrixOpen(true), []);
  const closeCrudMatrix = useCallback(() => setCrudMatrixOpen(false), []);
  const openProjectManager = useCallback(() => {
    setStartDialogOpen(false);
    setProjectManagerOpen(true);
  }, []);
  const closeProjectManager = useCallback(() => {
    setProjectManagerOpen(false);
    if (!workspaceStarted) setStartDialogOpen(true);
  }, [workspaceStarted]);
  const openExportDialog = useCallback((displayMode: CardDisplayMode) => {
    try {
      setExportDialog({ snapshot: createExportSnapshot(), cardDisplayMode: displayMode });
    } catch (error) {
      window.alert(error instanceof Error ? error.message : String(error));
    }
  }, [createExportSnapshot]);
  const openErdExportDialog = useCallback(() => openExportDialog(cardDisplayMode), [cardDisplayMode, openExportDialog]);
  const closeExportDialog = useCallback(() => setExportDialog(null), []);

  const placeExistingModel = useCallback(async (seedId: string) => {
    if (placements.some((placement) => placement.canvasId === activeCanvasId && placement.seedId === seedId)) return;
    const offset = activePlacements.length * 28;
    const hasOwnerPlacement = placements.some((placement) => placement.seedId === seedId && placement.accessMode === "owner");
    const placement: CanvasModelPlacement = { canvasId: activeCanvasId, seedId, x: 140 + offset, y: 120 + offset, accessMode: hasOwnerPlacement ? "readonly" : "owner" };
    if (!(await savePlacement(placement, true))) {
      window.alert("The model could not be placed on this canvas.");
      return;
    }
    startTransition(() => setLocalPlacements([...placements, placement]));
    setSelectedId(seedId);
    setModelCatalogOpen(false);
  }, [activeCanvasId, activePlacements.length, placements, savePlacement, setLocalPlacements]);

  const openOwnershipTransfer = useCallback((seedId?: string) => {
    const targetId = seedId ?? selectedSeed?.id;
    if (!targetId) return;
    setOwnershipTransferSeedId(targetId);
    setModelCatalogOpen(false);
  }, [selectedSeed?.id]);

  const confirmOwnershipTransfer = useCallback(async (targetCanvasId: string) => {
    if (!ownershipTransferSeedId) return false;
    const owner = placements.find((placement) => placement.seedId === ownershipTransferSeedId && placement.accessMode === "owner");
    if (!owner) return false;
    if (!(await transferOwnership(ownershipTransferSeedId, owner.canvasId, targetCanvasId))) {
      window.alert("Ownership changed while the dialog was open. Review the latest owner and try again.");
      return false;
    }
    const existingTarget = placements.find((placement) => placement.seedId === ownershipTransferSeedId && placement.canvasId === targetCanvasId);
    const sourceSeed = seeds.find((seed) => seed.id === ownershipTransferSeedId);
    const nextPlacements = placements.map((placement) => placement.seedId !== ownershipTransferSeedId ? placement : {
      ...placement,
      accessMode: placement.canvasId === targetCanvasId ? "owner" as const : placement.canvasId === owner.canvasId ? "readonly" as const : placement.accessMode
    });
    if (!existingTarget && sourceSeed) nextPlacements.push({ canvasId: targetCanvasId, seedId: ownershipTransferSeedId, x: sourceSeed.x + 40, y: sourceSeed.y + 40, accessMode: "owner" });
    startTransition(() => setLocalPlacements(nextPlacements));
    setOwnershipTransferSeedId(null);
    return true;
  }, [ownershipTransferSeedId, placements, seeds, setLocalPlacements, transferOwnership]);

  const removeSelectedModel = useCallback(async (seedId: string) => {
    const model = seeds.find((seed) => seed.id === seedId);
    const placement = placements.find((item) => item.canvasId === activeCanvasId && item.seedId === seedId);
    if (!model || !placement || participantSnapshotReadOnly) return false;
    if (placement.accessMode === "owner" && locks[seedId]?.id !== me.id && !(await lock(seedId))) {
      window.alert("The model must be unlocked before it can be deleted from the project.");
      return false;
    }
    const removed = await removeModel(seedId, activeCanvasId);
    if (!removed) {
      window.alert(placement.accessMode === "owner" ? "The model could not be deleted from the project." : "The model could not be removed from this canvas.");
      return false;
    }
    setSelectedId("");
    return true;
  }, [activeCanvasId, lock, locks, me.id, participantSnapshotReadOnly, placements, removeModel, seeds]);

  const handleCloseDisconnectedCowork = useCallback(() => {
    abandonParticipantRecovery();
    setCoworkClosed(true);
    window.setTimeout(() => window.close(), 0);
  }, [abandonParticipantRecovery]);

  function askLeaveLocalSession() {
    setLocalLeaveDialogOpen(true);
  }
  function stayInLocalSession() {
    setLocalLeaveDialogOpen(false);
  }
  function confirmLeaveLocalSession() {
    if (!leaveLocalTabSession()) return;
    setLocalLeaveDialogOpen(false);
    setCoworkClosed(true);
    window.setTimeout(() => window.close(), 0);
  }

  if (coworkClosed) return <CoworkClosedScreen />;

  const coworkRecoveryDialog = participantRecovery && <CoworkDisconnectionDialog
    reason={participantRecovery.reason}
    hasSnapshot={participantRecovery.hasSnapshot}
    updatedAt={participantRecovery.updatedAt}
    onViewSnapshot={viewParticipantSnapshot}
    onCloseWorkspace={handleCloseDisconnectedCowork}
  />;
  const workspaceStartDialog = startDialogOpen && !participantRecovery && <WorkspaceStartDialog
    starters={starterProjects}
    projects={projects}
    activeProjectId={activeProject?.projectId}
    recoveryReady={recoveryStatus.ready}
    recoveryError={recoveryStatus.error}
    localFileAvailable={nativeFileSystemAvailable}
    onCreateStarter={startFromTemplate}
    onLoadProject={startFromSavedProject}
    onImportProject={startFromUpload}
    onOpenLocalProject={startFromNativeFile}
    onManageProjects={openProjectManager}
  />;
  const localLeaveDialog = localLeaveDialogOpen && <LocalSessionLeaveDialog projectName={activeProject?.displayName} onStay={stayInLocalSession} onLeave={confirmLeaveLocalSession} />;
  const localConnectionNotice = localTabConnectionError && <div className="fixed left-1/2 top-3 z-[110] max-w-xl -translate-x-1/2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800 shadow-lg" role="alert">{localTabConnectionError}</div>;
  const aiActiveCanvas = workspaceMode === "dfd"
    ? { id: activeDfdCanvasId, name: dfd.canvases.find((canvas) => canvas.id === activeDfdCanvasId)?.name ?? "DFD canvas", kind: "dfd" as const }
    : { id: activeCanvasId, name: canvases.find((canvas) => canvas.id === activeCanvasId)?.name ?? "ERD canvas", kind: "erd" as const };
  const aiCanvasModelIds = workspaceMode === "dfd"
    ? dfd.nodes.filter((node) => node.canvasId === activeDfdCanvasId && node.modelId).map((node) => node.modelId!)
    : canvasSeeds.map((seed) => seed.id);
  const aiWorkspace = {
    project: { id: activeProject?.projectId, name: activeProject?.displayName ?? "ERDSketch project" },
    activeCanvas: aiActiveCanvas,
    canvasModelIds: [...new Set(aiCanvasModelIds)],
    models: seeds,
    domains,
    relationships,
    relationshipReferences,
    dfd
  };

  if (workspaceMode === "dfd") {
    return <AiAssistantProvider workspace={aiWorkspace}><>
      {workspaceStarted && !startDialogOpen && !canvasSelectionRequired && <GuidedTourTrigger tour="dfd" />}
      <DfdWorkspace dfd={dfd} erdCanvases={canvases} erdPlacements={placements} activeCanvasId={activeDfdCanvasId} models={seeds} me={me} users={users} connected={connected} isHost={isHost} recoveryReady={recoveryStatus.ready} persistentStorage={recoveryStatus.persistentStorage} recoveryError={localTabConnectionError ?? recoveryStatus.error} activeProject={activeProject ?? undefined} onOpenProjectManager={openProjectManager} onOpenExport={openExportDialog} onSetLocalDfd={setLocalDfd} onSaveDfd={saveDfd} onSaveCatalogModel={saveCatalogSeed} onSetLocalModels={setLocalSeeds} relationships={relationships} relationshipReferences={relationshipReferences} domains={domains} domainCategories={domainCategories} nameDisplayMode={nameDisplayMode} vocabularyCache={vocabularyCache} onLockModel={lock} onUnlockModel={unlock} onUpdateRelationshipReference={(relationshipId, patch) => void updateRelationshipReference(relationshipId, patch)} onDeleteRelationship={(relationshipId) => { const relationship = relationships.find((item) => item.id === relationshipId); if (relationship) void deleteRelationship(relationship); }} onCreateDomain={(name) => void createDomain(name)} onOpenDomainDictionary={openDomainDictionary} onApplyRefinement={applyRefinement} onActiveCanvasChange={setActiveDfdCanvasId} onSelectErdCanvas={selectErdCanvas} onCreateProjectCanvas={createProjectCanvas} onRenameProjectCanvas={renameProjectCanvas} onOpenCrudMatrix={openCrudMatrix} onShareWork={sharing.openHostDialog} onLeaveSession={isLocalTabParticipant ? askLeaveLocalSession : undefined} annotations={annotations} onSetLocalAnnotations={setLocalAnnotations} onSaveAnnotation={saveAnnotation} onUpdateAnnotationPresence={updateAnnotationPresence} onMoveCursor={moveCursor} onChangeCanvasPresence={changeCanvas} />
      {projectManagerOpen && <ProjectManagerDialog projects={projects} activeProjectId={activeProject?.projectId} isHost={isHost} recoveryReady={recoveryStatus.ready} recoveryError={recoveryStatus.error} fileSystemAvailable={fileSystemAvailable} starters={starterProjects} onCreateStarter={startFromTemplate} onCreate={createOpfsProject} onSaveAs={saveOpfsProjectAs} onLoad={loadOpfsProject} onRename={renameOpfsProject} onDelete={deleteOpfsProject} onOpenFileSystem={openProject} onSaveFileSystem={saveProject} onExport={exportProject} onImport={importProject} onClose={closeProjectManager} />}
      {crudMatrixOpen && <CrudMatrixDialog dfd={dfd} models={seeds} domains={domains} onChange={updateProjectDfd} onClose={closeCrudMatrix} />}
      {exportDialog && <ExportDialog canonicalProjectJSON={exportDialog.snapshot} projectName={activeProject?.displayName ?? "ERDSketch project"} exportSettings={exportSettings} onChangeExportSettings={(settings) => void saveExportSettings(settings)} onClose={closeExportDialog} />}
      {workspaceStartDialog}
      <ShareWorkDialog sharing={sharing} />
      <JoinSharedWorkDialog sharing={sharing} />
      {coworkRecoveryDialog}
      {localLeaveDialog}
      {localConnectionNotice}
      {participantSnapshotReadOnly && <CoworkReadOnlySnapshotNotice />}
    </></AiAssistantProvider>;
  }

  return (
    <AiAssistantProvider workspace={aiWorkspace}><VocabularyNavigationProvider onOpen={openVocabularyAt}><main className="h-screen overflow-hidden bg-slate-100 text-slate-950">
      {workspaceStarted && !startDialogOpen && !canvasSelectionRequired && <GuidedTourTrigger tour="erd" />}
      <div className="flex h-full">
        <Sidebar
          query={query}
          selectedSeed={selectedSeed}
          selectedOwner={selectedOwner}
          canEditSelected={canEditSelected}
          selectedPlacement={selectedPlacement}
          domains={domains}
          vocabularyEntries={vocabularyEntries}
          canDeleteSelected={!participantSnapshotReadOnly}
          onQueryChange={setQuery}
          onAddSeed={quickCreateSeed}
          onUpdateSeed={updateSeed}
          onRemoveSelected={removeSelectedModel}
          onOpenDomainDictionary={openDomainDictionary}
          onOpenVocabulary={openSidebarVocabulary}
        />

        <section className="flex min-w-0 flex-1 flex-col">
          <WorkspaceHeader
            me={me}
            users={users}
            connected={connected}
            canvasName={canvases.find((canvas) => canvas.id === activeCanvasId)?.name ?? "ERD canvas"}
            onRename={rename}
            onOpenCanvasSelector={() => setCanvasSelectorOpen(true)}
            onOpenModelCatalog={() => setModelCatalogOpen(true)}
            onOpenCrudMatrix={openCrudMatrix}
            onShareWork={sharing.openHostDialog}
            onLeaveSession={isLocalTabParticipant ? askLeaveLocalSession : undefined}
            isHost={isHost}
            recoveryReady={recoveryStatus.ready}
            persistentStorage={recoveryStatus.persistentStorage}
            recoveryError={localTabConnectionError ?? recoveryStatus.error}
            activeProject={activeProject ?? undefined}
            onOpenProjectManager={openProjectManager}
            onOpenExport={openErdExportDialog}
          />
          <DiagramCanvas
            canvasRef={canvasRef}
            dragState={dragState}
            viewport={viewport}
            seeds={visibleSeeds}
            allSeeds={canvasSeeds}
            cardWidths={canvasCardWidths}
            cardHeights={canvasCardHeights}
            descriptionHeights={canvasDescriptionHeights}
            projectSeeds={seeds}
            placements={placements}
            activeCanvasId={activeCanvasId}
            canvasTitle={canvases.find((canvas) => canvas.id === activeCanvasId)?.name ?? "ERD canvas"}
            relationships={canvasRelationships}
            relationshipReferences={relationshipReferences}
            domains={domains}
            domainCategories={domainCategories}
            selectedId={selectedId}
            displayMode={cardDisplayMode}
            nameDisplayMode={nameDisplayMode}
            onDisplayModeChange={setCardDisplayMode}
            onNameDisplayModeChange={setNameDisplayMode}
            vocabularyCache={vocabularyCache}
            locks={locks}
            me={me}
            remoteUsers={remoteUsers}
            onPointerDown={handleCanvasPointerDown}
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerLeave}
            onPointerUp={stopDragging}
            onSeedPointerDown={handleSeedPointerDown}
            onUpdateSeed={updateSeed}
            onModelEditingChange={handleModelEditingChange}
            onUnlockSeed={unlock}
            onRelationshipPointerDown={handleRelationshipPointerDown}
            onEditRelationship={(relationshipId) => void handleEditRelationship(relationshipId)}
            onUpdateRelationshipReference={updateRelationshipReference}
            onDeleteRelationship={(relationshipId) => {
              const relationship = relationships.find((item) => item.id === relationshipId);
              if (relationship) void deleteRelationship(relationship);
            }}
            onCreateDomain={(name) => void createDomain(name)}
            onOpenDomainDictionary={openDomainDictionary}
            onApplyRefinement={applyRefinement}
            annotationController={annotationController}
            annotationUsers={users.filter((user) => (user.canvasType ?? "erd") === "erd" && user.canvasId === activeCanvasId)}
            resolveAnnotationAnchor={resolveErdAnnotationAnchor}
            onResetView={resetView}
            onUpdateScale={updateScale}
          />
        </section>
      </div>
      {editingRelationship && (
        <RelationshipEditorDialog
          relationship={editingRelationship.relationship}
          source={seeds.find((seed) => seed.id === editingRelationship.relationship.sourceId)}
          target={seeds.find((seed) => seed.id === editingRelationship.relationship.targetId)}
          canDelete={!editingRelationship.create}
          onSave={(relationship) => void saveRelationshipChange(relationship, editingRelationship.create)}
          onDelete={() => void deleteRelationship(editingRelationship.relationship)}
          onClose={closeRelationshipEditor}
        />
      )}
      {domainDictionaryContext && (
        <DomainDictionaryDialog
          domains={domains}
          categories={domainCategories}
          canEdit={!participantSnapshotReadOnly}
          initialNameDisplayMode={nameDisplayMode}
          vocabularyCache={vocabularyCache}
          assignmentTarget={domainDictionaryContext.fieldId && domainDictionaryContext.label ? { fieldId: domainDictionaryContext.fieldId, label: domainDictionaryContext.label } : undefined}
          onChange={(domain) => void changeDomain(domain)}
          onCreateDomain={(name, categoryId) => void createDomain(name, categoryId)}
          onCreateCategory={(name) => void createDomainCategory(name)}
          onChangeCategory={(category) => void changeDomainCategory(category)}
          onImportCategory={(bundle) => void importDomainCategory(bundle)}
          onDelete={(domain) => void deleteDomain(domain)}
          onAssign={assignDomainFromDictionary}
          onClose={closeDomainDictionary}
        />
      )}
      {vocabularyOpen && (
        <VocabularyDialog
          seeds={seeds}
          domains={domains}
          entries={vocabularyEntries}
          cache={vocabularyCache}
          indexing={vocabularyIndexing}
          namingPolicy={namingPolicy}
          onNamingPolicyChange={(policy) => void saveNamingPolicy(policy)}
          onCreateEntry={createVocabularyEntry}
          onChangeEntry={changeVocabularyEntry}
          onDeleteEntry={deleteVocabularyEntry}
          onBindingChange={changeVocabularyBinding}
          onAliasReplace={replaceVocabularyAlias}
          focusMatchKey={vocabularyFocusKey}
          onClose={closeVocabulary}
        />
      )}
      {canvasSelectorOpen && <ProjectCanvasSelectorDialog erdCanvases={canvases} dfdCanvases={dfd.canvases} active={{ kind: "erd", id: activeCanvasId }} required={canvasSelectionRequired} onSelect={selectProjectCanvas} onCreate={createProjectCanvas} onRename={renameProjectCanvas} onClose={() => setCanvasSelectorOpen(false)} />}
      {projectManagerOpen && <ProjectManagerDialog projects={projects} activeProjectId={activeProject?.projectId} isHost={isHost} recoveryReady={recoveryStatus.ready} recoveryError={recoveryStatus.error} fileSystemAvailable={fileSystemAvailable} starters={starterProjects} onCreateStarter={startFromTemplate} onCreate={createOpfsProject} onSaveAs={saveOpfsProjectAs} onLoad={loadOpfsProject} onRename={renameOpfsProject} onDelete={deleteOpfsProject} onOpenFileSystem={openProject} onSaveFileSystem={saveProject} onExport={exportProject} onImport={importProject} onClose={closeProjectManager} />}
      {modelCatalogOpen && <ModelCatalogDialog seeds={seeds} canvases={canvases} placements={placements} activeCanvasId={activeCanvasId} onOpenPlacement={selectCanvas} onPlace={(seedId) => void placeExistingModel(seedId)} onTransfer={openOwnershipTransfer} onClose={() => setModelCatalogOpen(false)} />}
      {ownershipTransferSeedId && seeds.find((seed) => seed.id === ownershipTransferSeedId) && <OwnershipTransferDialog seed={seeds.find((seed) => seed.id === ownershipTransferSeedId)!} canvases={canvases} placements={placements} onTransfer={confirmOwnershipTransfer} onClose={() => setOwnershipTransferSeedId(null)} />}
      {crudMatrixOpen && <CrudMatrixDialog dfd={dfd} models={seeds} domains={domains} onChange={updateProjectDfd} onClose={closeCrudMatrix} />}
      {exportDialog && <ExportDialog canonicalProjectJSON={exportDialog.snapshot} projectName={activeProject?.displayName ?? "ERDSketch project"} exportSettings={exportSettings} onChangeExportSettings={(settings) => void saveExportSettings(settings)} onClose={closeExportDialog} />}
      {workspaceStartDialog}
      <ShareWorkDialog sharing={sharing} />
      <JoinSharedWorkDialog sharing={sharing} />
      {coworkRecoveryDialog}
      {localLeaveDialog}
      {localConnectionNotice}
      {participantSnapshotReadOnly && <CoworkReadOnlySnapshotNotice />}
    </main></VocabularyNavigationProvider></AiAssistantProvider>
  );
}
