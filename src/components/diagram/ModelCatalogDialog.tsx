import { ArrowRightLeft, ExternalLink, MapPin, Plus, Search, X } from "lucide-react";
import { useCallback, useMemo, useState, type ChangeEvent, type MouseEvent } from "react";
import type { CanvasModelPlacement, ErdCanvas, ModelSeed } from "../../features/modeling/types";

type ModelCatalogDialogProps = {
  seeds: ModelSeed[];
  canvases: ErdCanvas[];
  placements: CanvasModelPlacement[];
  activeCanvasId: string;
  onOpenPlacement: (canvasId: string, seedId: string) => void;
  onPlace: (seedId: string) => void;
  onTransfer: (seedId: string) => void;
  onClose: () => void;
};

export function ModelCatalogDialog({ seeds, canvases, placements, activeCanvasId, onOpenPlacement, onPlace, onTransfer, onClose }: ModelCatalogDialogProps) {
  const [query, setQuery] = useState("");
  const [canvasFilter, setCanvasFilter] = useState("");
  const visibleSeeds = useMemo(() => seeds.filter((seed) => {
    const matchesQuery = !query.trim() || `${seed.title} ${seed.role}`.toLowerCase().includes(query.trim().toLowerCase());
    const matchesCanvas = !canvasFilter || placements.some((placement) => placement.seedId === seed.id && placement.canvasId === canvasFilter);
    return matchesQuery && matchesCanvas;
  }), [canvasFilter, placements, query, seeds]);
  const handleQueryChange = useCallback((event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value), []);
  const handleCanvasFilterChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => setCanvasFilter(event.target.value), []);
  const handlePlace = useCallback((event: MouseEvent<HTMLButtonElement>) => onPlace(event.currentTarget.dataset.seedId!), [onPlace]);
  const handleTransfer = useCallback((event: MouseEvent<HTMLButtonElement>) => onTransfer(event.currentTarget.dataset.seedId!), [onTransfer]);
  const handleOpen = useCallback((event: MouseEvent<HTMLButtonElement>) => onOpenPlacement(event.currentTarget.dataset.canvasId!, event.currentTarget.dataset.seedId!), [onOpenPlacement]);

  return <div className="modal modal-open" role="dialog" aria-modal="true" aria-labelledby="model-catalog-title">
    <div className="modal-box h-[78vh] max-w-6xl rounded-xl bg-white p-0">
      <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4"><div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Project inventory</p><h2 id="model-catalog-title" className="text-xl font-bold">Models</h2></div><button type="button" className="btn btn-ghost btn-sm btn-square" onClick={onClose}><X size={18} /></button></header>
      <div className="flex gap-3 border-b border-slate-200 px-6 py-3"><label className="input input-bordered input-sm flex flex-1 items-center gap-2"><Search size={15} /><input className="grow" placeholder="Search models" value={query} onChange={handleQueryChange} /></label><select className="select select-bordered select-sm" value={canvasFilter} onChange={handleCanvasFilterChange}><option value="">All canvases</option>{canvases.map((canvas) => <option key={canvas.id} value={canvas.id}>{canvas.name}</option>)}</select></div>
      <div className="h-[calc(78vh-126px)] overflow-auto px-6 py-4"><table className="table table-pin-rows"><thead><tr><th>Model</th><th>Role</th><th>Owner canvas</th><th>Placed canvases</th><th className="text-right">Actions</th></tr></thead><tbody>{visibleSeeds.map((seed) => {
        const modelPlacements = placements.filter((placement) => placement.seedId === seed.id);
        const owner = modelPlacements.find((placement) => placement.accessMode === "owner");
        const placedHere = modelPlacements.some((placement) => placement.canvasId === activeCanvasId);
        const dfdOnly = seed.usageScope === "dfd_only";
        return <tr key={seed.id}><td><span className="font-bold">{seed.title}</span>{dfdOnly && <span className="badge badge-warning badge-sm ml-2">DFD only</span>}<span className="block text-xs text-slate-500">{modelPlacements.length} placement{modelPlacements.length === 1 ? "" : "s"}</span></td><td><span className="badge badge-outline">{seed.role}</span></td><td>{owner ? canvases.find((canvas) => canvas.id === owner.canvasId)?.name : <span className="text-slate-400">Shared / none</span>}</td><td><div className="flex max-w-md flex-wrap gap-1">{modelPlacements.map((placement) => <button key={placement.canvasId} type="button" data-canvas-id={placement.canvasId} data-seed-id={seed.id} className={`badge gap-1 ${placement.accessMode === "owner" ? "badge-primary" : "badge-ghost"}`} onClick={handleOpen}><MapPin size={11} />{canvases.find((canvas) => canvas.id === placement.canvasId)?.name} · {placement.accessMode}</button>)}</div></td><td><div className="flex justify-end gap-1">{!placedHere && !dfdOnly && <button type="button" data-seed-id={seed.id} className="btn btn-ghost btn-xs gap-1" onClick={handlePlace}><Plus size={13} />Place here</button>}<button type="button" data-seed-id={seed.id} className="btn btn-ghost btn-xs gap-1" disabled={dfdOnly || !owner || canvases.length < 2} onClick={handleTransfer}><ArrowRightLeft size={13} />Transfer</button>{owner && <button type="button" data-canvas-id={owner.canvasId} data-seed-id={seed.id} className="btn btn-ghost btn-xs btn-square" onClick={handleOpen} aria-label={`Open owner canvas for ${seed.title}`}><ExternalLink size={13} /></button>}</div></td></tr>;
      })}</tbody></table>{visibleSeeds.length === 0 && <p className="py-12 text-center text-sm text-slate-500">No models match these filters.</p>}</div>
    </div><button className="modal-backdrop" onClick={onClose} aria-label="Close model catalog" />
  </div>;
}
