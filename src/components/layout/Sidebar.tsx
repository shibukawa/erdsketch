import { AlignLeft, BookOpen, Braces, KeyRound, Languages, Search } from "lucide-react";
import { useCallback, useRef, useState, type ChangeEvent, type FormEvent, type MouseEvent } from "react";
import type { Collaborator } from "../../collaboration";
import type { CanvasModelPlacement, CardDisplayMode, ModelSeed, NameDisplayMode } from "../../features/modeling/types";
import { SeedInspector } from "../diagram/SeedInspector";
import { NameModeControl } from "../diagram/NameModeControl";

type SidebarProps = {
  query: string;
  cardDisplayMode: CardDisplayMode;
  nameDisplayMode: NameDisplayMode;
  selectedSeed?: ModelSeed;
  selectedOwner?: Collaborator;
  canEditSelected: boolean;
  selectedPlacement?: CanvasModelPlacement;
  onQueryChange: (query: string) => void;
  onCardDisplayModeChange: (mode: CardDisplayMode) => void;
  onNameDisplayModeChange: (mode: NameDisplayMode) => void;
  onAddSeed: (name: string) => Promise<void>;
  onUpdateSeed: (seedId: string, patch: Partial<ModelSeed>) => void;
  onOpenDomainDictionary: () => void;
  onOpenVocabulary: () => void;
  onOpenModelCatalog: () => void;
};

export function Sidebar({
  query,
  cardDisplayMode,
  nameDisplayMode,
  selectedSeed,
  selectedOwner,
  canEditSelected,
  selectedPlacement,
  onQueryChange,
  onCardDisplayModeChange,
  onNameDisplayModeChange,
  onAddSeed,
  onUpdateSeed,
  onOpenDomainDictionary,
  onOpenVocabulary,
  onOpenModelCatalog
}: SidebarProps) {
  const [newModelName, setNewModelName] = useState("");
  const [creatingModel, setCreatingModel] = useState(false);
  const newModelInputRef = useRef<HTMLInputElement | null>(null);
  const handleAddSeed = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = newModelName.trim();
    if (!name || creatingModel) return;
    setCreatingModel(true);
    await onAddSeed(name);
    setCreatingModel(false);
    setNewModelName("");
    newModelInputRef.current?.focus();
  }, [creatingModel, newModelName, onAddSeed]);

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

  const handleOpenDomainDictionary = useCallback(() => {
    onOpenDomainDictionary();
  }, [onOpenDomainDictionary]);

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

      <form className="mt-6" onSubmit={handleAddSeed}><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Quick create</p><div className="mt-2 join intent-add w-full rounded-lg"><input ref={newModelInputRef} className="input input-sm input-bordered join-item min-w-0 flex-1 bg-transparent" value={newModelName} disabled={creatingModel} onChange={(event) => setNewModelName(event.target.value)} placeholder="New model name" aria-label="New model name" /><button className="btn btn-primary btn-sm join-item" disabled={!newModelName.trim() || creatingModel}>Add</button></div><p className="mt-1 text-[11px] text-slate-500">Enter creates a model and keeps this input ready.</p></form>

      <label className="input input-bordered intent-search mt-4 flex h-11 items-center gap-2 rounded-lg">
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

      <section className="mt-4">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Names</p>
        <NameModeControl value={nameDisplayMode} onChange={onNameDisplayModeChange} />
      </section>

      {selectedSeed && (
        <SeedInspector seed={selectedSeed} owner={selectedOwner} canEdit={canEditSelected} placement={selectedPlacement} onUpdate={onUpdateSeed} />
      )}

      <div className="mt-auto pt-6">
        <button type="button" className="btn btn-outline mb-2 w-full justify-start gap-2" onClick={onOpenModelCatalog}>
          <Search size={17} />Models
        </button>
        <button type="button" className="btn btn-outline mb-2 w-full justify-start gap-2" onClick={onOpenVocabulary}>
          <Languages size={17} />Vocabulary
        </button>
        <button type="button" className="btn btn-outline w-full justify-start gap-2" onClick={handleOpenDomainDictionary}>
          <BookOpen size={17} />Domain dictionary
        </button>
      </div>
    </aside>
  );
}
