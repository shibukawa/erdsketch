import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent
} from "react";
import { useCollaboration } from "../collaboration";
import { DiagramCanvas } from "../components/diagram/DiagramCanvas";
import { Sidebar } from "../components/layout/Sidebar";
import { WorkspaceHeader } from "../components/layout/WorkspaceHeader";
import { RelationshipEditorDialog } from "../components/diagram/RelationshipEditorDialog";
import { DomainDictionaryDialog } from "../components/diagram/DomainDictionaryDialog";
import { VocabularyDialog } from "../components/diagram/VocabularyDialog";
import { VocabularyNavigationProvider } from "../components/diagram/VocabularyNavigationContext";
import { ProjectCanvasSelectorDialog, type ProjectCanvasKind } from "../components/layout/ProjectCanvasSelectorDialog";
import { WorkspaceStartDialog } from "../components/layout/WorkspaceStartDialog";
import { ModelCatalogDialog } from "../components/diagram/ModelCatalogDialog";
import { OwnershipTransferDialog } from "../components/diagram/OwnershipTransferDialog";
import { cardHeight, cardWidth, initialDomainCategories, initialDomains, initialRelationshipReferences, initialRelationships, initialSeeds } from "../features/modeling/constants";
import type { CanvasModelPlacement, CardDisplayMode, DataDomain, DfdState, DomainCategory, DomainCategoryBundle, DragState, ErdCanvas, ModelSeed, NameDisplayMode, RefinementResult, Relationship, RelationshipReference, Viewport, VocabularyBinding, VocabularyEntry } from "../features/modeling/types";
import { getCachedDisplayName, replaceAliasInSource, type VocabularyMatch } from "../features/modeling/vocabulary";
import { useVocabularyMatchCache } from "../features/modeling/useVocabularyMatchCache";
import { defaultVolumeEstimate } from "../features/modeling/capacity";
import { clampScale, flattenLabels, getFieldEffectiveName, getRelatedDragSeedIDs, getRelationshipDropTarget, getRelationshipReference, updateNameSet } from "../features/modeling/utils";
import { DfdWorkspace } from "./DfdWorkspace";
import { CrudMatrixDialog } from "../components/dfd/CrudMatrixDialog";

export function ModelingWorkspacePage() {
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
    vocabularyEntries,
    dfd,
    users,
    locks,
    connected,
    rename,
    changeCanvas,
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
    transferOwnership,
    saveRelationship,
    saveRefinement,
    saveDomain,
    saveDomainCategory,
    saveNamingPolicy,
    saveVocabularyEntry,
    setLocalSeeds,
    setLocalCanvases,
    setLocalDfd,
    setLocalPlacements,
    setLocalRelationships,
    setLocalDomains,
    setLocalDomainCategories,
    setLocalVocabularyEntries
  } = useCollaboration(initialSeeds, initialRelationships, initialRelationshipReferences, initialDomains, initialDomainCategories);
  const [query, setQuery] = useState("");
  const [workspaceMode, setWorkspaceMode] = useState<"erd" | "dfd">("erd");
  const [startDialogOpen, setStartDialogOpen] = useState(() => typeof window !== "undefined" && window.localStorage.getItem("erdsketch:workspace-started") !== "1");
  const [cardDisplayMode, setCardDisplayMode] = useState<CardDisplayMode>("description");
  const [nameDisplayMode, setNameDisplayMode] = useState<NameDisplayMode>("business");
  const [vocabularyOpen, setVocabularyOpen] = useState(false);
  const [vocabularyFocusKey, setVocabularyFocusKey] = useState<string | null>(null);
  const [activeCanvasId, setActiveCanvasId] = useState("main");
  const [activeDfdCanvasId, setActiveDfdCanvasId] = useState("dfd-main");
  const [canvasSelectorOpen, setCanvasSelectorOpen] = useState(false);
  const [modelCatalogOpen, setModelCatalogOpen] = useState(false);
  const [crudMatrixOpen, setCrudMatrixOpen] = useState(false);
  const [ownershipTransferSeedId, setOwnershipTransferSeedId] = useState<string | null>(null);
  const [titleFocusSeedId, setTitleFocusSeedId] = useState<string | null>(null);
  const [viewport, setViewport] = useState<Viewport>({ x: 260, y: 140, scale: 1 });
  const [dragState, setDragState] = useState<DragState>(null);
  const [selectedId, setSelectedId] = useState("order");
  const [editingRelationship, setEditingRelationship] = useState<{ relationship: Relationship; create: boolean } | null>(null);
  const [domainDictionaryContext, setDomainDictionaryContext] = useState<{ seedId?: string; fieldId?: string; label?: string } | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const historyRef = useRef<Record<string, { x: number; y: number }>[] >([]);
  const { cache: vocabularyCache, indexing: vocabularyIndexing } = useVocabularyMatchCache(seeds, domains, vocabularyEntries, namingPolicy);

  const activePlacements = useMemo(() => placements.filter((placement) => placement.canvasId === activeCanvasId), [activeCanvasId, placements]);
  const canvasSeeds = useMemo(() => activePlacements.flatMap((placement) => {
    const seed = seeds.find((candidate) => candidate.id === placement.seedId);
    return seed ? [{ ...seed, x: placement.x, y: placement.y }] : [];
  }), [activePlacements, seeds]);
  const activeSeedIds = useMemo(() => new Set(canvasSeeds.map((seed) => seed.id)), [canvasSeeds]);
  const canvasRelationships = useMemo(() => relationships.filter((relationship) => activeSeedIds.has(relationship.sourceId) && activeSeedIds.has(relationship.targetId)), [activeSeedIds, relationships]);

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
  const canEditSelected = !!selectedSeed && selectedPlacement?.accessMode === "owner" && selectedOwner?.id === me.id;
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
      const nextSeeds = seeds.map((seed) => (seed.id === seedId ? { ...seed, ...patch } : seed));
      const nextSeed = nextSeeds.find((seed) => seed.id === seedId);
      setLocalSeeds(nextSeeds);
      if (nextSeed) void saveSeed(nextSeed, false, activeCanvasId);
    },
    [activeCanvasId, activePlacements, saveSeed, seeds, setLocalSeeds]
  );

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

  const addSeedAt = useCallback(
    async (clientX?: number, clientY?: number, requestedTitle?: string) => {
      const index = seeds.length + 1;
      const point =
        clientX === undefined || clientY === undefined
          ? { x: 120 + index * 24, y: 120 + index * 18 }
          : screenToWorld(clientX, clientY);
      const seed: ModelSeed = {
        id: crypto.randomUUID(),
        title: requestedTitle?.trim() || `Model Seed ${index}`,
        description: "A rough model idea. Drag it near related seeds and rename it when it gets clearer.",
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
      setTitleFocusSeedId(seed.id);
      startTransition(() => {
        setLocalSeeds([...seeds, seed]);
        setLocalPlacements([...placements, { canvasId: activeCanvasId, seedId: seed.id, x: point.x, y: point.y, accessMode: "owner" }]);
      });

      if (await saveSeed(seed, true, activeCanvasId)) {
        await unlockOwnedExcept([seed.id]);
        await lock(seed.id);
      }
    },
    [activeCanvasId, lock, placements, saveSeed, screenToWorld, seeds, setLocalPlacements, setLocalSeeds, unlockOwnedExcept]
  );

  const handleTitleFocusHandled = useCallback((seedId: string) => {
    setTitleFocusSeedId((current) => current === seedId ? null : current);
  }, []);
  const quickCreateSeed = useCallback(async (name: string) => {
    await addSeedAt(undefined, undefined, name);
  }, [addSeedAt]);

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
      if ((event.target as HTMLElement).closest("article, button, input, textarea, [data-no-pan='true']")) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      setDragState({
        type: "pan",
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        origin: viewport
      });
    },
    [viewport]
  );

  const handleSeedPointerDown = useCallback(
    async (event: PointerEvent<HTMLElement>, seed: ModelSeed) => {
      event.stopPropagation();
      const placement = activePlacements.find((item) => item.seedId === seed.id);
      const owner = locks[seed.id];
      setSelectedId(seed.id);
      const target = event.target as HTMLElement;
      const noDrag = !!target.closest("[data-no-drag='true']");
      const point = screenToWorld(event.clientX, event.clientY);
      if (placement?.accessMode !== "owner") {
        if (noDrag) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        setDragState({
          type: "seed",
          pointerId: event.pointerId,
          seedId: seed.id,
          offsetX: point.x - seed.x,
          offsetY: point.y - seed.y,
          seedIds: [seed.id],
          origins: { [seed.id]: { x: seed.x, y: seed.y } },
          groupLocked: true,
          ready: true
        });
        return;
      }
      if (owner && owner.id !== me.id) return;
      const relatedSeedIDs = getRelatedDragSeedIDs(seed, canvasSeeds, canvasRelationships, relationshipReferences);
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
          origins: Object.fromEntries(canvasSeeds.filter((item) => relatedSeedIDs.includes(item.id)).map((item) => [item.id, { x: item.x, y: item.y }])),
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
    [activePlacements, canvasRelationships, canvasSeeds, lock, locks, me.id, relationshipReferences, screenToWorld, unlockOwnedExcept]
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
      const movedPlacements = placements.map((placement) => {
        if (placement.canvasId !== activeCanvasId || !dragState.seedIds.includes(placement.seedId)) return placement;
        return { ...placement, x: dragState.origins[placement.seedId].x + deltaX, y: dragState.origins[placement.seedId].y + deltaY };
      });
      setLocalPlacements(movedPlacements);
      for (const movedPlacement of movedPlacements.filter((placement) => placement.canvasId === activeCanvasId && dragState.seedIds.includes(placement.seedId))) void savePlacement(movedPlacement);
    },
    [activeCanvasId, cursorToWorld, dragState, lockAll, moveCursor, placements, savePlacement, screenToWorld, setLocalPlacements]
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
      if (!dragState || dragState.pointerId !== event.pointerId) return;
      if (dragState.type === "relationship") {
        const point = screenToWorld(event.clientX, event.clientY);
        const target = getRelationshipDropTarget(dragState.sourceId, point, canvasSeeds);
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
        historyRef.current.push(dragState.origins);
        if (dragState.groupLocked) await unlockAll(dragState.seedIds.filter((seedId) => seedId !== dragState.seedId));
      }
      setDragState(null);
    },
    [canvasSeeds, dragState, lockAll, screenToWorld, unlockAll]
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
  }, [activeCanvasId, lockAll, placements, savePlacement, setLocalPlacements, unlockAll]);

  const handleCanvasDoubleClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (!(event.target as HTMLElement).closest("article, button, input, textarea")) {
        void addSeedAt(event.clientX, event.clientY);
      }
    },
    [addSeedAt]
  );

  const resetView = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || canvasSeeds.length === 0) {
      setViewport({ x: 260, y: 140, scale: 1 });
      return;
    }
    const bounds = canvas.getBoundingClientRect();
    const minX = Math.min(...canvasSeeds.map((seed) => seed.x));
    const minY = Math.min(...canvasSeeds.map((seed) => seed.y));
    const maxX = Math.max(...canvasSeeds.map((seed) => seed.x + cardWidth));
    const maxY = Math.max(...canvasSeeds.map((seed) => seed.y + cardHeight));
    setViewport({
      x: bounds.width / 2 - (minX + maxX) / 2,
      y: bounds.height / 2 - (minY + maxY) / 2,
      scale: 1
    });
  }, [canvasSeeds]);

  const applyRefinement = useCallback(async (result: RefinementResult) => {
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
    if (!(await saveRefinement(result))) return false;
    startTransition(() => {
      setLocalSeeds(result.seeds);
      setLocalRelationships(result.relationships, result.relationshipReferences);
      setLocalDomains(result.domains);
    });
    return true;
  }, [lockAll, relationships, saveRefinement, seeds, setLocalDomains, setLocalRelationships, setLocalSeeds]);

  const createVocabularyEntry = useCallback(async (entry: VocabularyEntry) => {
    if (!(await saveVocabularyEntry(entry, { create: true }))) {
      window.alert("The term conflicts with an earlier business name or alias, or is invalid. Earlier definitions take priority.");
      return false;
    }
    setLocalVocabularyEntries((current) => [...current, entry]);
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
      if (created) setWorkspaceMode("erd");
      return created;
    }
    const created = await createDfdCanvas(name);
    if (created) setWorkspaceMode("dfd");
    return created;
  }, [createCanvas, createDfdCanvas]);
  const renameProjectCanvas = useCallback((kind: ProjectCanvasKind, canvas: { id: string; name: string }) => kind === "erd" ? renameCanvas(canvas) : renameDfdCanvas(canvas), [renameCanvas, renameDfdCanvas]);
  const startWorkspace = useCallback((kind: "erd" | "dfd") => {
    window.localStorage.setItem("erdsketch:workspace-started", "1");
    setWorkspaceMode(kind);
    setStartDialogOpen(false);
  }, []);
  const updateProjectDfd = useCallback((next: DfdState) => {
    setLocalDfd(next);
    void saveDfd(next).then((saved) => { if (!saved) window.alert("The CRUD Matrix change could not be saved."); });
  }, [saveDfd, setLocalDfd]);
  const openCrudMatrix = useCallback(() => setCrudMatrixOpen(true), []);
  const closeCrudMatrix = useCallback(() => setCrudMatrixOpen(false), []);

  const placeExistingModel = useCallback(async (seedId: string) => {
    if (placements.some((placement) => placement.canvasId === activeCanvasId && placement.seedId === seedId)) return;
    const offset = activePlacements.length * 28;
    const placement: CanvasModelPlacement = { canvasId: activeCanvasId, seedId, x: 140 + offset, y: 120 + offset, accessMode: "readonly" };
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

  if (workspaceMode === "dfd") {
    return <><DfdWorkspace dfd={dfd} erdCanvases={canvases} activeCanvasId={activeDfdCanvasId} models={seeds} me={me} users={users} connected={connected} onSetLocalDfd={setLocalDfd} onSaveDfd={saveDfd} onSaveCatalogModel={saveCatalogSeed} onSetLocalModels={setLocalSeeds} relationships={relationships} relationshipReferences={relationshipReferences} domains={domains} domainCategories={domainCategories} nameDisplayMode={nameDisplayMode} vocabularyCache={vocabularyCache} onLockModel={lock} onUnlockModel={unlock} onUpdateRelationshipReference={(relationshipId, patch) => void updateRelationshipReference(relationshipId, patch)} onDeleteRelationship={(relationshipId) => { const relationship = relationships.find((item) => item.id === relationshipId); if (relationship) void deleteRelationship(relationship); }} onCreateDomain={(name) => void createDomain(name)} onOpenDomainDictionary={openDomainDictionary} onApplyRefinement={applyRefinement} onActiveCanvasChange={setActiveDfdCanvasId} onSelectErdCanvas={selectErdCanvas} onCreateProjectCanvas={createProjectCanvas} onRenameProjectCanvas={renameProjectCanvas} onOpenCrudMatrix={openCrudMatrix} />{crudMatrixOpen && <CrudMatrixDialog dfd={dfd} models={seeds} onChange={updateProjectDfd} onClose={closeCrudMatrix} />}{startDialogOpen && <WorkspaceStartDialog onStart={startWorkspace} />}</>;
  }

  return (
    <VocabularyNavigationProvider onOpen={openVocabularyAt}><main className="h-screen overflow-hidden bg-slate-100 text-slate-950">
      <div className="flex h-full">
        <Sidebar
          query={query}
          cardDisplayMode={cardDisplayMode}
          nameDisplayMode={nameDisplayMode}
          selectedSeed={selectedSeed}
          selectedOwner={selectedOwner}
          canEditSelected={canEditSelected}
          selectedPlacement={selectedPlacement}
          onQueryChange={setQuery}
          onCardDisplayModeChange={setCardDisplayMode}
          onNameDisplayModeChange={setNameDisplayMode}
          onAddSeed={quickCreateSeed}
          onUpdateSeed={updateSeed}
          onOpenDomainDictionary={() => openDomainDictionary()}
          onOpenVocabulary={openVocabulary}
        />

        <section className="flex min-w-0 flex-1 flex-col">
          <WorkspaceHeader
            me={me}
            users={users}
            connected={connected}
            scale={viewport.scale}
            canvasName={canvases.find((canvas) => canvas.id === activeCanvasId)?.name ?? "ERD canvas"}
            onRename={rename}
            onResetView={resetView}
            onUpdateScale={updateScale}
            onOpenCanvasSelector={() => setCanvasSelectorOpen(true)}
            onOpenModelCatalog={() => setModelCatalogOpen(true)}
            onOpenCrudMatrix={openCrudMatrix}
          />
          <DiagramCanvas
            canvasRef={canvasRef}
            dragState={dragState}
            viewport={viewport}
            seeds={visibleSeeds}
            allSeeds={canvasSeeds}
            projectSeeds={seeds}
            placements={placements}
            activeCanvasId={activeCanvasId}
            titleFocusSeedId={titleFocusSeedId}
            relationships={canvasRelationships}
            relationshipReferences={relationshipReferences}
            domains={domains}
            domainCategories={domainCategories}
            selectedId={selectedId}
            displayMode={cardDisplayMode}
            nameDisplayMode={nameDisplayMode}
            vocabularyCache={vocabularyCache}
            locks={locks}
            me={me}
            remoteUsers={remoteUsers}
            onDoubleClick={handleCanvasDoubleClick}
            onPointerDown={handleCanvasPointerDown}
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerLeave}
            onPointerUp={stopDragging}
            onSeedPointerDown={handleSeedPointerDown}
            onUpdateSeed={updateSeed}
            onTitleFocusHandled={handleTitleFocusHandled}
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
          canEdit
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
      {canvasSelectorOpen && <ProjectCanvasSelectorDialog erdCanvases={canvases} dfdCanvases={dfd.canvases} active={{ kind: "erd", id: activeCanvasId }} onSelect={selectProjectCanvas} onCreate={createProjectCanvas} onRename={renameProjectCanvas} onClose={() => setCanvasSelectorOpen(false)} />}
      {modelCatalogOpen && <ModelCatalogDialog seeds={seeds} canvases={canvases} placements={placements} activeCanvasId={activeCanvasId} onOpenPlacement={selectCanvas} onPlace={(seedId) => void placeExistingModel(seedId)} onTransfer={openOwnershipTransfer} onClose={() => setModelCatalogOpen(false)} />}
      {ownershipTransferSeedId && seeds.find((seed) => seed.id === ownershipTransferSeedId) && <OwnershipTransferDialog seed={seeds.find((seed) => seed.id === ownershipTransferSeedId)!} canvases={canvases} placements={placements} onTransfer={confirmOwnershipTransfer} onClose={() => setOwnershipTransferSeedId(null)} />}
      {crudMatrixOpen && <CrudMatrixDialog dfd={dfd} models={seeds} onChange={updateProjectDfd} onClose={closeCrudMatrix} />}
      {startDialogOpen && <WorkspaceStartDialog onStart={startWorkspace} />}
    </main></VocabularyNavigationProvider>
  );
}
