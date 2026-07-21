import { BookOpen, Braces, Languages, Search } from "lucide-react";
import { startTransition, useCallback, useMemo, useRef, useState, type ChangeEvent, type ClipboardEvent, type FormEvent } from "react";
import type { Collaborator } from "../../collaboration";
import { parseBulkEntryText } from "../../features/modeling/bulkEntry";
import { assessModelMaturity, type ModelMaturityIssue } from "../../features/modeling/maturity";
import type { CanvasModelPlacement, DataDomain, ModelSeed, VocabularyEntry } from "../../features/modeling/types";
import { BulkEntryConfirmDialog, type BulkEntryCandidate } from "../diagram/BulkEntryConfirmDialog";
import { MaturityValidation } from "../diagram/MaturityValidation";
import { ModelRemovalDialog } from "../diagram/ModelRemovalDialog";
import { SeedInspector } from "../diagram/SeedInspector";

type SidebarProps = {
  query: string;
  selectedSeed?: ModelSeed;
  selectedOwner?: Collaborator;
  canEditSelected: boolean;
  selectedPlacement?: CanvasModelPlacement;
  domains: DataDomain[];
  vocabularyEntries: VocabularyEntry[];
  canDeleteSelected: boolean;
  onQueryChange: (query: string) => void;
  modelNames: string[];
  onAddSeed: (name: string) => Promise<void>;
  onAddSeeds: (names: string[]) => Promise<void>;
  onUpdateSeed: (seedId: string, patch: Partial<ModelSeed>) => void;
  onRemoveSelected: (seedId: string) => Promise<boolean>;
  onOpenDomainDictionary: (seedId?: string, fieldId?: string) => void;
  onOpenVocabulary: (matchKey?: string) => void;
};

export function Sidebar({
  query,
  selectedSeed,
  selectedOwner,
  canEditSelected,
  selectedPlacement,
  domains,
  vocabularyEntries,
  canDeleteSelected,
  onQueryChange,
  modelNames,
  onAddSeed,
  onAddSeeds,
  onUpdateSeed,
  onRemoveSelected,
  onOpenDomainDictionary,
  onOpenVocabulary
}: SidebarProps) {
  const [newModelName, setNewModelName] = useState("");
  const [creatingModel, setCreatingModel] = useState(false);
  const [bulkCandidates, setBulkCandidates] = useState<BulkEntryCandidate[] | null>(null);
  const [removalTarget, setRemovalTarget] = useState<ModelSeed | null>(null);
  const [removingModel, setRemovingModel] = useState(false);
  const newModelInputRef = useRef<HTMLInputElement | null>(null);
  const maturity = useMemo(() => selectedSeed ? assessModelMaturity(selectedSeed, domains, vocabularyEntries) : undefined, [domains, selectedSeed, vocabularyEntries]);
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

  const handleBulkPaste = useCallback((event: ClipboardEvent<HTMLInputElement>) => {
    if (creatingModel) return;
    const pasted = event.clipboardData.getData("text/plain");
    const parsed = parseBulkEntryText(pasted);
    if (!parsed.hadMultipleRows && !parsed.hadAdditionalColumns) return;
    event.preventDefault();
    setBulkCandidates(parsed.names.map((name) => ({ id: crypto.randomUUID(), value: name, selected: true })));
  }, [creatingModel]);

  const handleBulkConfirm = useCallback(async (names: string[]) => {
    setCreatingModel(true);
    await onAddSeeds(names);
    setCreatingModel(false);
    startTransition(() => {
      setBulkCandidates(null);
      setNewModelName("");
    });
    newModelInputRef.current?.focus();
  }, [onAddSeeds]);

  const handleBulkClose = useCallback(() => {
    if (creatingModel) return;
    setBulkCandidates(null);
    newModelInputRef.current?.focus();
  }, [creatingModel]);

  const handleQueryChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onQueryChange(event.target.value);
    },
    [onQueryChange]
  );

  const handleOpenDomainDictionary = useCallback(() => {
    onOpenDomainDictionary();
  }, [onOpenDomainDictionary]);
  const handleOpenVocabulary = useCallback(() => { onOpenVocabulary(); }, [onOpenVocabulary]);

  const removeSelected = useCallback(async (model: ModelSeed) => {
    setRemovingModel(true);
    const removed = await onRemoveSelected(model.id);
    setRemovingModel(false);
    if (removed) setRemovalTarget(null);
  }, [onRemoveSelected]);

  const handleDeleteRequest = useCallback(() => {
    if (!selectedSeed) return;
    if (selectedPlacement?.accessMode === "owner") setRemovalTarget(selectedSeed);
    else void removeSelected(selectedSeed);
  }, [removeSelected, selectedPlacement?.accessMode, selectedSeed]);
  const handleDeleteConfirm = useCallback(() => { if (removalTarget) void removeSelected(removalTarget); }, [removalTarget, removeSelected]);
  const handleDeleteClose = useCallback(() => setRemovalTarget(null), []);
  const handleResolveMaturityIssue = useCallback((issue: ModelMaturityIssue) => {
    if (!selectedSeed) return;
    if (issue.kind === "missing-domain") onOpenDomainDictionary(selectedSeed.id, issue.fieldId);
    if (issue.kind === "missing-vocabulary-name") onOpenVocabulary(issue.actionKey);
  }, [onOpenDomainDictionary, onOpenVocabulary, selectedSeed]);

  return (
    <aside data-tour="erd-sidebar" className="z-20 flex w-[330px] shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-white px-5 py-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950 text-white">
          <Braces size={20} />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-500">ERDSketch</p>
          <h1 className="text-xl font-bold">ERD Sketch</h1>
        </div>
      </div>

      <nav className="mt-6" aria-label="Modeling dictionaries">
        <button data-tour="erd-vocabulary" type="button" className="btn btn-outline mb-2 w-full justify-start gap-2" onClick={handleOpenVocabulary}>
          <Languages size={17} />Vocabulary
        </button>
        <button data-tour="erd-domains" type="button" className="btn btn-outline w-full justify-start gap-2" onClick={handleOpenDomainDictionary}>
          <BookOpen size={17} />Domain dictionary
        </button>
      </nav>

      <form data-tour="erd-quick-create" className="mt-5 border-t border-slate-200 pt-4" onSubmit={handleAddSeed}><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Quick create</p><div className="mt-2 join intent-add w-full rounded-lg"><input ref={newModelInputRef} className="input input-sm input-bordered join-item min-w-0 flex-1 bg-transparent" value={newModelName} disabled={creatingModel} onChange={(event) => setNewModelName(event.target.value)} onPaste={handleBulkPaste} placeholder="New model name" aria-label="New model name" /><button className="btn btn-primary btn-sm join-item" disabled={!newModelName.trim() || creatingModel}>Add</button></div><p className="mt-1 text-[11px] text-slate-500">Enter creates a model. Paste multiple rows to review and add in bulk.</p></form>

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

      {selectedSeed && (
        <>
          <section className="mt-5 border-t border-slate-200 pt-4"><h2 className="mb-3 text-sm font-bold text-slate-800">Edit</h2><SeedInspector seed={selectedSeed} owner={selectedOwner} canEdit={canEditSelected} placement={selectedPlacement} onUpdate={onUpdateSeed} onDelete={handleDeleteRequest} canDelete={canDeleteSelected} deleting={removingModel}/></section>
          {maturity && <section className="mt-5 border-t border-slate-200 pt-4"><h2 className="mb-3 text-sm font-bold text-slate-800">Validation</h2><MaturityValidation assessment={maturity} onResolve={handleResolveMaturityIssue}/></section>}
        </>
      )}

      {removalTarget && <ModelRemovalDialog model={removalTarget} pending={removingModel} onConfirm={handleDeleteConfirm} onClose={handleDeleteClose}/>}
      {bulkCandidates && <BulkEntryConfirmDialog title="Review model candidates" description="Pasted rows are listed below. Edit names, uncheck rows, then add the valid candidates." confirmLabel="Add selected models" occupiedNames={modelNames} initialCandidates={bulkCandidates} note="Only the first TSV column is used. Existing names cannot be added." onConfirm={handleBulkConfirm} onClose={handleBulkClose}/>}
    </aside>
  );
}
