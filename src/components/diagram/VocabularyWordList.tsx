import { ClipboardCopy, Copy, ListChecks, Plus, Search, Sparkles } from "lucide-react";
import type { ChangeEvent, FocusEvent, KeyboardEvent, MouseEvent, RefObject } from "react";
import type { VocabularySuggestion } from "../../features/modeling/browserAi";
import type { VocabularyEntry } from "../../features/modeling/types";
import type { VocabularyAutofillTarget } from "../../features/modeling/vocabulary";

type VocabularyWordListProps = {
  entries: VocabularyEntry[];
  query: string;
  selectedEntryId: string | null;
  bulkEditing: boolean;
  quickEntry: string;
  quickEntryPending: boolean;
  quickEntryInputRef: RefObject<HTMLInputElement | null>;
  language: "en" | "ja";
  suggestions: Record<string, VocabularySuggestion>;
  pendingId: string | null;
  autofillPending: VocabularyAutofillTarget | null;
  onQueryChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onQuickEntryChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onQuickEntryKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onToggleBulkEditing: () => void;
  onSelectEntry: (entryId: string) => void;
  onEntryCommit: (event: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onSuggest: (event: MouseEvent<HTMLButtonElement>) => void;
  onApplySuggestion: (event: MouseEvent<HTMLButtonElement>) => void;
  onAutofill: (target: VocabularyAutofillTarget) => void;
};

function entryBackground(entry: VocabularyEntry) {
  if (!entry.systemName && !entry.physicalName) return "bg-[linear-gradient(110deg,rgb(255_247_237)_0%,rgb(255_247_237)_50%,rgb(254_252_232)_50%,rgb(254_252_232)_100%)] hover:brightness-[0.98]";
  if (!entry.systemName) return "bg-orange-50 hover:bg-orange-100";
  if (!entry.physicalName) return "bg-yellow-50 hover:bg-yellow-100";
  return "bg-white hover:bg-slate-50";
}

export function VocabularyWordList({ entries, query, selectedEntryId, bulkEditing, quickEntry, quickEntryPending, quickEntryInputRef, language, suggestions, pendingId, autofillPending, onQueryChange, onQuickEntryChange, onQuickEntryKeyDown, onToggleBulkEditing, onSelectEntry, onEntryCommit, onSuggest, onApplySuggestion, onAutofill }: VocabularyWordListProps) {
  const normalized = query.trim().toLocaleLowerCase();
  const visibleEntries = entries.filter((entry) => !normalized || [entry.businessName, entry.systemName, entry.physicalName, entry.meaning, entry.memo, ...entry.aliases].some((value) => value.toLocaleLowerCase().includes(normalized)));
  const missingSystemCount = entries.filter((entry) => !entry.systemName.trim()).length;
  const missingPhysicalCount = entries.filter((entry) => !entry.physicalName.trim()).length;

  function handleRowClick(event: MouseEvent<HTMLButtonElement>) {
    onSelectEntry(event.currentTarget.dataset.entryId ?? "");
  }

  function handleInputClick(event: MouseEvent<HTMLElement>) {
    event.stopPropagation();
  }

  function handleAutofill(event: MouseEvent<HTMLButtonElement>) {
    onAutofill(event.currentTarget.dataset.autofill as VocabularyAutofillTarget);
  }

  return <section className="flex min-w-0 flex-1 flex-col px-6 py-4">
    <div className="flex flex-wrap items-center gap-3">
      <label data-tour="vocabulary-add-entry" className="input input-bordered intent-add flex min-w-64 flex-1 items-center gap-2"><Plus size={15} /><input ref={quickEntryInputRef} autoFocus value={quickEntry} onChange={onQuickEntryChange} onKeyDown={onQuickEntryKeyDown} aria-label="New business name" aria-busy={quickEntryPending} placeholder="Add term" spellCheck lang={language} /><kbd className="kbd kbd-sm">{quickEntryPending ? "Adding…" : "Enter"}</kbd></label>
      <button type="button" className={`btn btn-sm gap-1 ${bulkEditing ? "btn-neutral" : "btn-outline"}`} aria-pressed={bulkEditing} onClick={onToggleBulkEditing}><ListChecks size={15} />Bulk settings</button>
      {missingSystemCount > 0 && <button type="button" data-autofill="system" className="btn btn-sm border-orange-300 bg-orange-50 text-orange-800 hover:bg-orange-100" disabled={autofillPending !== null} title="Fill every empty system name with its business name" onClick={handleAutofill}><ClipboardCopy size={14} />Copy as is <span className="badge badge-sm">{missingSystemCount}</span></button>}
      {missingPhysicalCount > 0 && <button type="button" data-autofill="physical" className="btn btn-sm border-yellow-300 bg-yellow-50 text-yellow-900 hover:bg-yellow-100" disabled={autofillPending !== null} title="Fill every empty physical name with its snake_case business name" onClick={handleAutofill}><Copy size={14} />Copy as small <span className="badge badge-sm">{missingPhysicalCount}</span></button>}
      <label className="input input-bordered input-sm ml-auto flex w-72 items-center gap-2"><Search size={14} /><span className="sr-only">Search word list</span><input value={query} onChange={onQueryChange} aria-label="Search word list" /></label>
    </div>
    <div className="mt-4 min-h-0 flex-1 overflow-auto rounded-lg border border-slate-200">
      <div className={`sticky top-0 z-10 grid ${bulkEditing ? "grid-cols-[minmax(150px,1fr)_minmax(150px,1fr)_minmax(150px,1fr)_100px]" : "grid-cols-[minmax(160px,1fr)_minmax(160px,1fr)_minmax(160px,1fr)]"} gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold uppercase text-slate-500`}><span>Business</span><span>System</span><span>Physical</span>{bulkEditing && <span>Assist</span>}</div>
      <div>{visibleEntries.map((entry) => {
        const selected = entry.id === selectedEntryId;
        const suggestion = suggestions[entry.id];
        if (!bulkEditing) return <button data-i18n-skip key={entry.id} type="button" data-entry-id={entry.id} className={`grid w-full grid-cols-[minmax(160px,1fr)_minmax(160px,1fr)_minmax(160px,1fr)] items-center gap-2 border-b border-slate-100 px-3 py-3 text-left text-sm last:border-b-0 ${entryBackground(entry)} ${selected ? "relative z-[1] ring-2 ring-inset ring-blue-500" : ""}`} aria-pressed={selected} onClick={handleRowClick}><strong className="truncate">{entry.businessName}</strong><span className={`truncate ${entry.systemName ? "text-slate-700" : "text-orange-700"}`}>{entry.systemName || "—"}</span><code className={`truncate ${entry.physicalName ? "text-slate-700" : "text-yellow-800"}`}>{entry.physicalName || "—"}</code></button>;
        return <div key={entry.id} className={`border-b border-slate-100 p-2 last:border-b-0 ${entryBackground(entry)}`}>
          <div className="grid grid-cols-[minmax(150px,1fr)_minmax(150px,1fr)_minmax(150px,1fr)_100px] items-center gap-2">
            <input data-i18n-skip data-entry-id={entry.id} data-entry-key="businessName" className="input input-sm input-bordered bg-white" defaultValue={entry.businessName} spellCheck lang={language} onBlur={onEntryCommit} onClick={handleInputClick} />
            <input data-i18n-skip data-entry-id={entry.id} data-entry-key="systemName" className="input input-sm input-bordered bg-white" defaultValue={entry.systemName} spellCheck lang={language} onBlur={onEntryCommit} onClick={handleInputClick} />
            <input data-i18n-skip data-entry-id={entry.id} data-entry-key="physicalName" className="input input-sm input-bordered bg-white font-mono" defaultValue={entry.physicalName} spellCheck={false} onBlur={onEntryCommit} onClick={handleInputClick} />
            <button type="button" data-entry-id={entry.id} className="btn btn-sm btn-outline gap-1" disabled={pendingId === entry.id} onClick={onSuggest}><Sparkles size={14} />Suggest</button>
          </div>
          {suggestion && <button type="button" data-entry-id={entry.id} className="mt-2 flex w-full rounded-md bg-violet-100 p-2 text-left text-sm" onClick={onApplySuggestion}><strong data-i18n-skip>{suggestion.system}</strong><code data-i18n-skip className="ml-2">{suggestion.physical}</code><span className="ml-auto text-violet-700">Click to apply</span></button>}
        </div>;
      })}{visibleEntries.length === 0 && <p className="px-4 py-12 text-center text-sm text-slate-400">No vocabulary terms found.</p>}</div>
    </div>
    <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500"><span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-orange-200" />System name missing</span><span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-yellow-200" />Physical name missing</span></div>
  </section>;
}
