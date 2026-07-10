import { AlignLeft, Braces, KeyRound, MousePointer2, Move, Plus, Search, Sparkles, ZoomIn } from "lucide-react";
import { useCallback, type ChangeEvent, type MouseEvent } from "react";
import type { Collaborator } from "../../collaboration";
import type { CardDisplayMode, ModelSeed } from "../../features/modeling/types";
import { SeedInspector } from "../diagram/SeedInspector";

type SidebarProps = {
  query: string;
  cardDisplayMode: CardDisplayMode;
  selectedSeed?: ModelSeed;
  selectedOwner?: Collaborator;
  canEditSelected: boolean;
  onQueryChange: (query: string) => void;
  onCardDisplayModeChange: (mode: CardDisplayMode) => void;
  onAddSeed: () => void;
  onUpdateSeed: (seedId: string, patch: Partial<ModelSeed>) => void;
};

export function Sidebar({
  query,
  cardDisplayMode,
  selectedSeed,
  selectedOwner,
  canEditSelected,
  onQueryChange,
  onCardDisplayModeChange,
  onAddSeed,
  onUpdateSeed
}: SidebarProps) {
  const handleAddSeed = useCallback(() => {
    onAddSeed();
  }, [onAddSeed]);

  const handleQueryChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onQueryChange(event.target.value);
    },
    [onQueryChange]
  );

  const handleCardDisplayModeClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      onCardDisplayModeChange(event.currentTarget.dataset.mode as CardDisplayMode);
    },
    [onCardDisplayModeChange]
  );

  return (
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

      <button className="btn btn-neutral mt-6 w-full gap-2 rounded-lg" onClick={handleAddSeed}>
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
          onChange={handleQueryChange}
        />
      </label>

      <section className="mt-4">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Card content</p>
        <div className="mt-2 grid grid-cols-2 rounded-lg bg-slate-100 p-1" role="group" aria-label="Model card content">
          <button
            type="button"
            data-mode="description"
            className={`flex items-center justify-center gap-2 rounded-md px-2 py-2 text-xs font-bold transition-colors ${
              cardDisplayMode === "description" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
            aria-pressed={cardDisplayMode === "description"}
            onClick={handleCardDisplayModeClick}
          >
            <AlignLeft size={14} /> Description
          </button>
          <button
            type="button"
            data-mode="key-fields"
            className={`flex items-center justify-center gap-2 rounded-md px-2 py-2 text-xs font-bold transition-colors ${
              cardDisplayMode === "key-fields" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
            aria-pressed={cardDisplayMode === "key-fields"}
            onClick={handleCardDisplayModeClick}
          >
            <KeyRound size={14} /> Key fields
          </button>
        </div>
      </section>

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
        <SeedInspector seed={selectedSeed} owner={selectedOwner} canEdit={canEditSelected} onUpdate={onUpdateSeed} />
      )}

      <section className="mt-5 rounded-lg border border-blue-200 bg-blue-50 p-4 text-blue-950">
        <div className="flex items-center gap-2 font-bold">
          <Sparkles size={17} />
          Matured level
        </div>
        <p className="mt-2 text-sm leading-5">New models start at level 6. Lower values move through conceptual and logical stages toward matured.</p>
      </section>
    </aside>
  );
}
