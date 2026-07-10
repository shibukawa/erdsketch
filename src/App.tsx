import {
  Braces,
  Database,
  Focus,
  LocateFixed,
  MousePointer2,
  Move,
  Plus,
  Search,
  Sparkles,
  ZoomIn,
  ZoomOut
} from "lucide-react";
import rough from "roughjs/bundled/rough.esm";
import { PointerEvent, WheelEvent, useEffect, useMemo, useRef, useState } from "react";

type EntityRole = "master" | "transaction" | "summary" | "history" | "work";
type Dependency = "independent" | "dependent";

type ModelSeed = {
  id: string;
  title: string;
  description: string;
  x: number;
  y: number;
  role: EntityRole;
  dependency: Dependency;
  hasPrivacy: boolean;
  roughness: number;
  rotation: number;
};

type Viewport = {
  x: number;
  y: number;
  scale: number;
};

type DragState =
  | {
      type: "pan";
      pointerId: number;
      startX: number;
      startY: number;
      origin: Viewport;
    }
  | {
      type: "seed";
      pointerId: number;
      seedId: string;
      offsetX: number;
      offsetY: number;
    }
  | null;

type RoughShapeProps = {
  width: number;
  height: number;
  roughness: number;
  fill: string;
  stroke: string;
  selected?: boolean;
};

type RoughLinkProps = {
  path: string;
  roughness: number;
};

const roleOptions: EntityRole[] = ["master", "transaction", "summary", "history", "work"];
const dependencyOptions: Dependency[] = ["independent", "dependent"];

const roleMeta: Record<EntityRole, { label: string; fill: string; stroke: string; chip: string }> = {
  master: {
    label: "master",
    fill: "rgba(236,253,245,0.96)",
    stroke: "#059669",
    chip: "border-emerald-200 bg-emerald-50 text-emerald-800"
  },
  transaction: {
    label: "transaction",
    fill: "rgba(239,246,255,0.96)",
    stroke: "#2563eb",
    chip: "border-blue-200 bg-blue-50 text-blue-800"
  },
  summary: {
    label: "summary",
    fill: "rgba(254,252,232,0.96)",
    stroke: "#ca8a04",
    chip: "border-yellow-200 bg-yellow-50 text-yellow-800"
  },
  history: {
    label: "history",
    fill: "rgba(245,243,255,0.96)",
    stroke: "#7c3aed",
    chip: "border-violet-200 bg-violet-50 text-violet-800"
  },
  work: {
    label: "work",
    fill: "rgba(248,250,252,0.96)",
    stroke: "#64748b",
    chip: "border-slate-200 bg-slate-50 text-slate-700"
  }
};

const roughnessSteps = [0.5, 1.25, 3.5, 6];
const cardWidth = 270;
const cardHeight = 214;

const initialSeeds: ModelSeed[] = [
  {
    id: "order",
    title: "Order",
    description: "Transaction root. Grow lifecycle, state, and line items from here.",
    x: 80,
    y: 40,
    role: "transaction",
    dependency: "independent",
    hasPrivacy: false,
    roughness: 1.25,
    rotation: -0.5
  },
  {
    id: "customer",
    title: "Customer",
    description: "Master candidate. Ownership and distribution pattern are still open.",
    x: 430,
    y: 70,
    role: "master",
    dependency: "independent",
    hasPrivacy: true,
    roughness: 0.5,
    rotation: 0.4
  },
  {
    id: "product",
    title: "Product",
    description: "Reference data. Could be snapshot at order time.",
    x: 760,
    y: 120,
    role: "master",
    dependency: "independent",
    hasPrivacy: false,
    roughness: 3.5,
    rotation: -0.8
  },
  {
    id: "order-item",
    title: "Order Item",
    description: "Likely dependent entity extracted from repeated product fields.",
    x: 230,
    y: 320,
    role: "transaction",
    dependency: "dependent",
    hasPrivacy: false,
    roughness: 6,
    rotation: 0.7
  },
  {
    id: "shipping-address",
    title: "Shipping Address",
    description: "May grow as Value Object or transaction snapshot.",
    x: 610,
    y: 390,
    role: "transaction",
    dependency: "dependent",
    hasPrivacy: true,
    roughness: 6,
    rotation: -0.3
  }
];

const clampScale = (scale: number) => Math.min(2.4, Math.max(0.35, scale));
const clampRoughness = (roughness: number) => Math.min(6, Math.max(0.5, roughness));

function flattenLabels(seed: ModelSeed) {
  return [seed.dependency, seed.role, ...(seed.hasPrivacy ? ["privacy"] : [])];
}

function RoughShape({ width, height, roughness, fill, stroke, selected }: RoughShapeProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    svg.replaceChildren();
    const rc = rough.svg(svg);
    const shape = rc.rectangle(4, 4, width - 8, height - 8, {
      roughness,
      bowing: 1.6,
      stroke: selected ? "#0f172a" : stroke,
      strokeWidth: selected ? 2.8 : 2,
      fill,
      fillStyle: "solid"
    });
    svg.appendChild(shape);
  }, [fill, height, roughness, selected, stroke, width]);

  return <svg ref={svgRef} className="pointer-events-none absolute inset-0 h-full w-full" width={width} height={height} aria-hidden="true" />;
}

function RoughLink({ path, roughness }: RoughLinkProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    svg.replaceChildren();
    const rc = rough.svg(svg);
    const shape = rc.path(path, {
      roughness,
      bowing: 1.8,
      stroke: "rgba(71,85,105,0.68)",
      strokeWidth: 2,
      fill: "none"
    });
    svg.appendChild(shape);
  }, [path, roughness]);

  return <svg ref={svgRef} className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden="true" />;
}

export function App() {
  const [seeds, setSeeds] = useState(initialSeeds);
  const [query, setQuery] = useState("");
  const [viewport, setViewport] = useState<Viewport>({ x: 260, y: 140, scale: 1 });
  const [dragState, setDragState] = useState<DragState>(null);
  const [selectedId, setSelectedId] = useState("order");
  const canvasRef = useRef<HTMLDivElement | null>(null);

  const visibleSeeds = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return seeds;
    return seeds.filter((seed) =>
      [seed.title, seed.description, String(seed.roughness), ...flattenLabels(seed)].some((value) => value.toLowerCase().includes(normalized))
    );
  }, [query, seeds]);

  const selectedSeed = seeds.find((seed) => seed.id === selectedId) ?? seeds[0];

  const updateSeed = (seedId: string, patch: Partial<ModelSeed>) => {
    setSeeds((current) => current.map((seed) => (seed.id === seedId ? { ...seed, ...patch } : seed)));
  };

  const screenToWorld = (clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (clientX - rect.left - viewport.x) / viewport.scale,
      y: (clientY - rect.top - viewport.y) / viewport.scale
    };
  };

  const addSeedAt = (clientX?: number, clientY?: number) => {
    const index = seeds.length + 1;
    const point =
      clientX === undefined || clientY === undefined ? { x: 120 + index * 24, y: 120 + index * 18 } : screenToWorld(clientX, clientY);
    const seed: ModelSeed = {
      id: `model-seed-${index}`,
      title: `Model Seed ${index}`,
      description: "A rough model idea. Drag it near related seeds and rename it when it gets clearer.",
      x: point.x,
      y: point.y,
      role: "transaction",
      dependency: "independent",
      hasPrivacy: false,
      roughness: 6,
      rotation: index % 2 === 0 ? 0.6 : -0.6
    };
    setSeeds((current) => [...current, seed]);
    setSelectedId(seed.id);
  };

  const updateScale = (nextScale: number, anchor?: { clientX: number; clientY: number }) => {
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
  };

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const isZoomGesture = event.ctrlKey || event.metaKey;
    if (isZoomGesture) {
      updateScale(viewport.scale * (event.deltaY > 0 ? 0.9 : 1.1), { clientX: event.clientX, clientY: event.clientY });
      return;
    }
    setViewport((current) => ({
      ...current,
      x: current.x - event.deltaX,
      y: current.y - event.deltaY
    }));
  };

  const handleCanvasPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragState({
      type: "pan",
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origin: viewport
    });
  };

  const handleSeedPointerDown = (event: PointerEvent<HTMLElement>, seed: ModelSeed) => {
    if ((event.target as HTMLElement).closest("[data-no-drag='true']")) return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = screenToWorld(event.clientX, event.clientY);
    setSelectedId(seed.id);
    setDragState({
      type: "seed",
      pointerId: event.pointerId,
      seedId: seed.id,
      offsetX: point.x - seed.x,
      offsetY: point.y - seed.y
    });
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
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
    setSeeds((current) =>
      current.map((seed) =>
        seed.id === dragState.seedId
          ? {
              ...seed,
              x: point.x - dragState.offsetX,
              y: point.y - dragState.offsetY
            }
          : seed
      )
    );
  };

  const stopDragging = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    setDragState(null);
  };

  const resetView = () => setViewport({ x: 260, y: 140, scale: 1 });

  return (
    <main className="h-screen overflow-hidden bg-slate-100 text-slate-950">
      <div className="flex h-full">
        <aside className="z-20 flex w-[330px] shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-white px-5 py-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950 text-white">
              <Braces size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500">ERDSketch</p>
              <h1 className="text-xl font-bold">ERD Sketch</h1>
            </div>
          </div>

          <button className="btn btn-neutral mt-6 w-full gap-2 rounded-lg" onClick={() => addSeedAt()}>
            <Plus size={18} />
            Add Model Seed
          </button>

          <label className="input input-bordered mt-4 flex h-11 items-center gap-2 rounded-lg bg-slate-50">
            <Search size={16} className="text-slate-400" />
            <input
              type="text"
              className="grow text-sm"
              placeholder="Search model seeds"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>

          <section className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
              <MousePointer2 size={16} />
              Canvas controls
            </div>
            <div className="mt-3 space-y-2 text-sm text-slate-600">
              <p className="flex items-center gap-2">
                <Move size={14} />
                Drag empty space to pan
              </p>
              <p className="flex items-center gap-2">
                <ZoomIn size={14} />
                Pinch or Ctrl-wheel to zoom
              </p>
              <p className="flex items-center gap-2">
                <Plus size={14} />
                Double click canvas to add
              </p>
            </div>
          </section>

          {selectedSeed && (
            <section className="mt-5 min-h-[320px] overflow-auto rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Selected model seed</p>
              <h2 className="mt-1 truncate text-lg font-bold">{selectedSeed.title}</h2>

              <label className="mt-4 block">
                <span className="text-sm font-bold text-slate-600">Rough.js roughness</span>
                <input
                  type="range"
                  className="range range-primary range-sm mt-2"
                  min={0.5}
                  max={6}
                  step={0.25}
                  value={selectedSeed.roughness}
                  onChange={(event) => updateSeed(selectedSeed.id, { roughness: clampRoughness(Number(event.target.value)) })}
                />
              </label>
              <div className="mt-2 grid grid-cols-4 gap-1">
                {roughnessSteps.map((step) => (
                  <button
                    key={step}
                    className={`btn btn-xs min-h-8 rounded-md ${selectedSeed.roughness === step ? "btn-neutral" : "btn-outline"}`}
                    onClick={() => updateSeed(selectedSeed.id, { roughness: step })}
                  >
                    {step}
                  </button>
                ))}
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <p className="text-sm font-bold text-slate-600">Role</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {roleOptions.map((role) => {
                      const active = selectedSeed.role === role;
                      return (
                        <button
                          key={role}
                          className={`rounded-md border px-2 py-1 text-xs font-semibold ${
                            active ? roleMeta[role].chip : "border-slate-200 bg-slate-50 text-slate-700"
                          }`}
                          onClick={() => updateSeed(selectedSeed.id, { role })}
                        >
                          {role}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-bold text-slate-600">Dependency</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {dependencyOptions.map((dependency) => {
                      const active = selectedSeed.dependency === dependency;
                      return (
                        <button
                          key={dependency}
                          className={`rounded-md border px-2 py-1 text-xs font-semibold ${
                            active ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-slate-50 text-slate-700"
                          }`}
                          onClick={() => updateSeed(selectedSeed.id, { dependency })}
                        >
                          {dependency}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <label className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <span className="text-sm font-bold text-slate-600">Privacy</span>
                  <input
                    type="checkbox"
                    className="toggle toggle-primary toggle-sm"
                    checked={selectedSeed.hasPrivacy}
                    onChange={(event) => updateSeed(selectedSeed.id, { hasPrivacy: event.target.checked })}
                  />
                </label>
              </div>
            </section>
          )}

          <section className="mt-5 rounded-lg border border-blue-200 bg-blue-50 p-4 text-blue-950">
            <div className="flex items-center gap-2 font-bold">
              <Sparkles size={17} />
              Roughness as maturity
            </div>
            <p className="mt-2 text-sm leading-5">New seeds start at roughness 6. Lower values make the card feel more settled.</p>
          </section>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="z-10 flex items-center justify-between border-b border-slate-200 bg-white px-7 py-4 shadow-sm">
            <div>
              <p className="text-sm font-semibold text-slate-500">Miro-like model workspace</p>
              <h2 className="text-2xl font-bold">Place model seeds anywhere</h2>
            </div>
            <div className="flex items-center gap-2">
              <button className="btn btn-outline btn-sm rounded-lg gap-2" onClick={resetView}>
                <LocateFixed size={16} />
                Reset
              </button>
              <div className="join">
                <button className="btn join-item btn-sm" onClick={() => updateScale(viewport.scale * 0.85)}>
                  <ZoomOut size={16} />
                </button>
                <span className="join-item flex h-8 min-w-16 items-center justify-center border-y border-slate-300 bg-white px-3 text-sm font-semibold">
                  {Math.round(viewport.scale * 100)}%
                </span>
                <button className="btn join-item btn-sm" onClick={() => updateScale(viewport.scale * 1.15)}>
                  <ZoomIn size={16} />
                </button>
              </div>
              <button className="btn btn-primary btn-sm rounded-lg gap-2">
                <Focus size={16} />
                Grow Selected
              </button>
            </div>
          </header>

          <div
            ref={canvasRef}
            className={`erd-canvas relative min-h-0 flex-1 overflow-hidden ${
              dragState?.type === "pan" ? "cursor-grabbing" : "cursor-grab"
            }`}
            onDoubleClick={(event) => {
              if (event.target === event.currentTarget) addSeedAt(event.clientX, event.clientY);
            }}
            onPointerDown={handleCanvasPointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={stopDragging}
            onPointerCancel={stopDragging}
            onWheel={handleWheel}
          >
            <div
              className="absolute left-0 top-0 h-[2400px] w-[3200px] origin-top-left"
              style={{
                transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`
              }}
            >
              <div className="pointer-events-none absolute inset-0">
                <RoughLink path="M300 180 C365 165, 410 168, 485 195" roughness={2.1} />
                <RoughLink path="M300 235 C315 300, 330 335, 400 388" roughness={2.5} />
                <RoughLink path="M650 226 C718 220, 760 240, 820 310" roughness={2.8} />
              </div>

              {visibleSeeds.map((seed) => {
                const meta = roleMeta[seed.role];
                return (
                  <article
                    key={seed.id}
                    className={`model-seed-card absolute w-[270px] select-none p-4 ${selectedId === seed.id ? "is-selected" : ""}`}
                    style={{
                      left: seed.x,
                      top: seed.y,
                      transform: `rotate(${seed.rotation}deg)`
                    }}
                    onPointerDown={(event) => handleSeedPointerDown(event, seed)}
                  >
                    <RoughShape
                      width={cardWidth}
                      height={cardHeight}
                      roughness={seed.roughness}
                      fill={meta.fill}
                      stroke={meta.stroke}
                      selected={selectedId === seed.id}
                    />

                    <div className="relative">
                      <div className="flex items-start gap-3">
                        <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white/80 text-slate-800">
                          <Database size={18} strokeWidth={2.1} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Model Seed</p>
                          <input
                            data-no-drag="true"
                            className="w-full rounded-md bg-transparent text-xl font-bold leading-tight outline-none focus:bg-white/80 focus:px-1"
                            value={seed.title}
                            onChange={(event) => updateSeed(seed.id, { title: event.target.value })}
                            onPointerDown={(event) => event.stopPropagation()}
                            aria-label={`${seed.title} title`}
                          />
                        </div>
                      </div>

                      <textarea
                        data-no-drag="true"
                        className="mt-3 h-16 w-full resize-none rounded-md bg-transparent text-sm leading-5 text-slate-700 outline-none focus:bg-white/80 focus:px-1"
                        value={seed.description}
                        onChange={(event) => updateSeed(seed.id, { description: event.target.value })}
                        onPointerDown={(event) => event.stopPropagation()}
                        aria-label={`${seed.title} description`}
                      />

                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {flattenLabels(seed).map((tag) => (
                          <span
                            key={tag}
                            className={`rounded-md border px-2 py-1 text-xs font-semibold ${
                              tag === seed.role ? roleMeta[seed.role].chip : "border-slate-200 bg-white/80 text-slate-700"
                            }`}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
