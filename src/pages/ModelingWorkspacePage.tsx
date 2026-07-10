import {
  startTransition,
  useCallback,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
  type WheelEvent
} from "react";
import { useCollaboration } from "../collaboration";
import { DiagramCanvas } from "../components/diagram/DiagramCanvas";
import { Sidebar } from "../components/layout/Sidebar";
import { WorkspaceHeader } from "../components/layout/WorkspaceHeader";
import { initialSeeds } from "../features/modeling/constants";
import type { CardDisplayMode, DragState, ModelSeed, Viewport } from "../features/modeling/types";
import { clampScale, flattenLabels } from "../features/modeling/utils";

export function ModelingWorkspacePage() {
  const { me, seeds, users, locks, connected, rename, moveCursor, lock, unlock, saveSeed, setLocalSeeds } = useCollaboration(initialSeeds);
  const [query, setQuery] = useState("");
  const [cardDisplayMode, setCardDisplayMode] = useState<CardDisplayMode>("description");
  const [viewport, setViewport] = useState<Viewport>({ x: 260, y: 140, scale: 1 });
  const [dragState, setDragState] = useState<DragState>(null);
  const [selectedId, setSelectedId] = useState("order");
  const canvasRef = useRef<HTMLDivElement | null>(null);

  const visibleSeeds = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return seeds;
    return seeds.filter((seed) =>
      [seed.title, seed.description, String(seed.maturedLevel), ...flattenLabels(seed), ...(seed.fields ?? []).map((field) => field.name)].some((value) =>
        value.toLowerCase().includes(normalized)
      )
    );
  }, [query, seeds]);

  const selectedSeed = useMemo(() => seeds.find((seed) => seed.id === selectedId) ?? seeds[0], [seeds, selectedId]);
  const selectedOwner = selectedSeed ? locks[selectedSeed.id] : undefined;
  const canEditSelected = !!selectedSeed && selectedOwner?.id === me.id;
  const remoteUsers = useMemo(
    () => users.filter((user) => user.id !== me.id && (user.x !== 0 || user.y !== 0)),
    [me.id, users]
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
        await lock(seed.id);
      }
    },
    [lock, saveSeed, screenToWorld, seeds, setLocalSeeds]
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
    (event: WheelEvent<HTMLDivElement>) => {
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
      const target = event.target as HTMLElement;
      const noDrag = !!target.closest("[data-no-drag='true']");
      const point = screenToWorld(event.clientX, event.clientY);
      if (!noDrag) {
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
          return;
        }
      }
      if (!owner && !(await lock(seed.id))) {
        if (!noDrag && event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
        return;
      }
      setSelectedId(seed.id);
      if (noDrag) {
        if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) target.focus();
        return;
      }
      setDragState({
        type: "seed",
        pointerId: event.pointerId,
        seedId: seed.id,
        offsetX: point.x - seed.x,
        offsetY: point.y - seed.y
      });
    },
    [lock, locks, me.id, screenToWorld]
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
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

      const point = screenToWorld(event.clientX, event.clientY);
      const nextSeeds = seeds.map((seed) =>
        seed.id === dragState.seedId
          ? {
              ...seed,
              x: point.x - dragState.offsetX,
              y: point.y - dragState.offsetY
            }
          : seed
      );
      setLocalSeeds(nextSeeds);
      const movedSeed = nextSeeds.find((seed) => seed.id === dragState.seedId);
      if (movedSeed) void saveSeed(movedSeed);
    },
    [cursorToWorld, dragState, moveCursor, saveSeed, screenToWorld, seeds, setLocalSeeds]
  );

  const handlePointerLeave = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const cursor = cursorToWorld(event.clientX, event.clientY);
      moveCursor(cursor.x, cursor.y);
    },
    [cursorToWorld, moveCursor]
  );

  const stopDragging = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!dragState || dragState.pointerId !== event.pointerId) return;
      setDragState(null);
    },
    [dragState]
  );

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
            onWheel={handleWheel}
            onSeedPointerDown={handleSeedPointerDown}
            onUpdateSeed={updateSeed}
            onUnlockSeed={unlock}
          />
        </section>
      </div>
    </main>
  );
}
