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
import { initialDomainCategories, initialDomains, initialRelationshipReferences, initialRelationships, initialSeeds } from "../features/modeling/constants";
import type { CardDisplayMode, DataDomain, DomainCategory, DomainCategoryBundle, DragState, ModelSeed, RefinementResult, Relationship, RelationshipReference, Viewport } from "../features/modeling/types";
import { clampScale, flattenLabels, getFieldEffectiveName, getRelatedDragSeedIDs, getRelationshipDropTarget, getRelationshipReference } from "../features/modeling/utils";

export function ModelingWorkspacePage() {
  const {
    me,
    seeds,
    relationships,
    relationshipReferences,
    domains,
    domainCategories,
    users,
    locks,
    connected,
    rename,
    moveCursor,
    lock,
    unlock,
    lockAll,
    unlockAll,
    saveSeed,
    saveRelationship,
    saveRefinement,
    saveDomain,
    saveDomainCategory,
    setLocalSeeds,
    setLocalRelationships,
    setLocalDomains,
    setLocalDomainCategories
  } = useCollaboration(initialSeeds, initialRelationships, initialRelationshipReferences, initialDomains, initialDomainCategories);
  const [query, setQuery] = useState("");
  const [cardDisplayMode, setCardDisplayMode] = useState<CardDisplayMode>("description");
  const [viewport, setViewport] = useState<Viewport>({ x: 260, y: 140, scale: 1 });
  const [dragState, setDragState] = useState<DragState>(null);
  const [selectedId, setSelectedId] = useState("order");
  const [editingRelationship, setEditingRelationship] = useState<{ relationship: Relationship; create: boolean } | null>(null);
  const [domainDictionaryContext, setDomainDictionaryContext] = useState<{ seedId?: string; fieldId?: string; label?: string } | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const historyRef = useRef<Record<string, { x: number; y: number }>[] >([]);

  const visibleSeeds = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return seeds;
    return seeds.filter((seed) =>
      [seed.title, seed.description, String(seed.maturedLevel), ...flattenLabels(seed), ...(seed.fields ?? []).map((field) => getFieldEffectiveName(field, domains))].some((value) =>
        value.toLowerCase().includes(normalized)
      )
    );
  }, [domains, query, seeds]);

  const selectedSeed = useMemo(() => seeds.find((seed) => seed.id === selectedId) ?? seeds[0], [seeds, selectedId]);
  const selectedOwner = selectedSeed ? locks[selectedSeed.id] : undefined;
  const canEditSelected = !!selectedSeed && selectedOwner?.id === me.id;
  const remoteUsers = useMemo(
    () => users.filter((user) => user.id !== me.id && (user.x !== 0 || user.y !== 0)),
    [me.id, users]
  );

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
      const nextSeeds = seeds.map((seed) => (seed.id === seedId ? { ...seed, ...patch } : seed));
      const nextSeed = nextSeeds.find((seed) => seed.id === seedId);
      setLocalSeeds(nextSeeds);
      if (nextSeed) void saveSeed(nextSeed);
    },
    [saveSeed, seeds, setLocalSeeds]
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
    async (clientX?: number, clientY?: number) => {
      const index = seeds.length + 1;
      const point =
        clientX === undefined || clientY === undefined
          ? { x: 120 + index * 24, y: 120 + index * 18 }
          : screenToWorld(clientX, clientY);
      const seed: ModelSeed = {
        id: `model-seed-${index}`,
        title: `Model Seed ${index}`,
        description: "A rough model idea. Drag it near related seeds and rename it when it gets clearer.",
        fields: [],
        x: point.x,
        y: point.y,
        role: "transaction",
        dependency: "independent",
        hasPrivacy: false,
        maturedLevel: 6,
        rotation: index % 2 === 0 ? 0.6 : -0.6
      };

      setSelectedId(seed.id);
      startTransition(() => {
        setLocalSeeds([...seeds, seed]);
      });

      if (await saveSeed(seed, true)) {
        await unlockOwnedExcept([seed.id]);
        await lock(seed.id);
      }
    },
    [lock, saveSeed, screenToWorld, seeds, setLocalSeeds, unlockOwnedExcept]
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
      const owner = locks[seed.id];
      if (owner && owner.id !== me.id) return;
      setSelectedId(seed.id);
      const target = event.target as HTMLElement;
      const noDrag = !!target.closest("[data-no-drag='true']");
      const point = screenToWorld(event.clientX, event.clientY);
      const relatedSeedIDs = getRelatedDragSeedIDs(seed, seeds, relationships, relationshipReferences);
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
          origins: Object.fromEntries(seeds.filter((item) => relatedSeedIDs.includes(item.id)).map((item) => [item.id, { x: item.x, y: item.y }])),
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
    [lock, locks, me.id, relationshipReferences, relationships, screenToWorld, seeds, unlockOwnedExcept]
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
      const nextSeeds = seeds.map((seed) =>
        dragState.seedIds.includes(seed.id)
          ? {
              ...seed,
              x: dragState.origins[seed.id].x + deltaX,
              y: dragState.origins[seed.id].y + deltaY
            }
          : seed
      );
      setLocalSeeds(nextSeeds);
      for (const movedSeed of nextSeeds.filter((seed) => dragState.seedIds.includes(seed.id))) void saveSeed(movedSeed);
    },
    [cursorToWorld, dragState, lockAll, moveCursor, saveSeed, screenToWorld, seeds, setLocalSeeds]
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
        const target = getRelationshipDropTarget(dragState.sourceId, point, seeds);
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
    [dragState, lockAll, screenToWorld, seeds, unlockAll]
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
        const nextSeeds = seeds.map((seed) => (origins[seed.id] ? { ...seed, ...origins[seed.id] } : seed));
        setLocalSeeds(nextSeeds);
        for (const seed of nextSeeds.filter((seed) => origins[seed.id])) await saveSeed(seed);
        await unlockAll(seedIDs);
      })();
    };
    window.addEventListener("keydown", handleUndo);
    return () => window.removeEventListener("keydown", handleUndo);
  }, [lockAll, saveSeed, seeds, setLocalSeeds, unlockAll]);

  const handleCanvasDoubleClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (!(event.target as HTMLElement).closest("article, button, input, textarea")) {
        void addSeedAt(event.clientX, event.clientY);
      }
    },
    [addSeedAt]
  );

  const resetView = useCallback(() => {
    setViewport({ x: 260, y: 140, scale: 1 });
  }, []);

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

  return (
    <main className="h-screen overflow-hidden bg-slate-100 text-slate-950">
      <div className="flex h-full">
        <Sidebar
          query={query}
          cardDisplayMode={cardDisplayMode}
          selectedSeed={selectedSeed}
          selectedOwner={selectedOwner}
          canEditSelected={canEditSelected}
          onQueryChange={setQuery}
          onCardDisplayModeChange={setCardDisplayMode}
          onAddSeed={addSeedAt}
          onUpdateSeed={updateSeed}
          onOpenDomainDictionary={() => openDomainDictionary()}
        />

        <section className="flex min-w-0 flex-1 flex-col">
          <WorkspaceHeader
            me={me}
            users={users}
            connected={connected}
            scale={viewport.scale}
            onRename={rename}
            onResetView={resetView}
            onUpdateScale={updateScale}
          />
          <DiagramCanvas
            canvasRef={canvasRef}
            dragState={dragState}
            viewport={viewport}
            seeds={visibleSeeds}
            allSeeds={seeds}
            relationships={relationships}
            relationshipReferences={relationshipReferences}
            domains={domains}
            domainCategories={domainCategories}
            selectedId={selectedId}
            displayMode={cardDisplayMode}
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
    </main>
  );
}
