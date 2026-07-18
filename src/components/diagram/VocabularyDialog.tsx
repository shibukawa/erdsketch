import { CircleCheck, CircleX, Plus, Replace, Settings, Sparkles, TriangleAlert, X } from "lucide-react";
import { startTransition, useCallback, useEffect, useMemo, useState, type ChangeEvent, type FocusEvent, type KeyboardEvent, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { suggestVocabularyNames, type VocabularySuggestion } from "../../features/modeling/browserAi";
import type { DataDomain, ModelSeed, NamingPolicy, VocabularyBinding, VocabularyEntry } from "../../features/modeling/types";
import { vocabularyTermConflict, type VocabularyMatch, type VocabularyMatchCache } from "../../features/modeling/vocabulary";
import { ProjectSettingsDialog } from "./ProjectSettingsDialog";
import { VocabularyRegistrationDialog } from "./VocabularyRegistrationDialog";
import { VocabularyDisplayName } from "./VocabularyDisplayName";
import { GuidedTourButton } from "../guidedTour/GuidedTourButton";
import { GuidedTourTrigger } from "../guidedTour/GuidedTourTrigger";

type VocabularyDialogProps = {
  seeds: ModelSeed[];
  domains: DataDomain[];
  entries: VocabularyEntry[];
  cache: VocabularyMatchCache;
  indexing: boolean;
  namingPolicy: NamingPolicy;
  onNamingPolicyChange: (policy: NamingPolicy) => void;
  onCreateEntry: (entry: VocabularyEntry) => Promise<boolean>;
  onChangeEntry: (entry: VocabularyEntry) => Promise<boolean>;
  onDeleteEntry: (entry: VocabularyEntry) => Promise<boolean>;
  onBindingChange: (match: VocabularyMatch, binding: VocabularyBinding) => Promise<boolean>;
  onAliasReplace: (match: VocabularyMatch, segmentIndex: number) => Promise<boolean>;
  focusMatchKey?: string | null;
  onClose: () => void;
};

const statusMeta = {
  unmatched: { label: "Unmatched", className: "text-red-600", Icon: CircleX },
  correction_required: { label: "Correction", className: "text-red-600", Icon: Replace },
  incomplete: { label: "Incomplete", className: "text-amber-600", Icon: TriangleAlert },
  complete: { label: "Complete", className: "text-emerald-600", Icon: CircleCheck }
};

export function VocabularyDialog({ seeds, domains, entries, cache, indexing, namingPolicy, onNamingPolicyChange, onCreateEntry, onChangeEntry, onDeleteEntry, onBindingChange, onAliasReplace, focusMatchKey, onClose }: VocabularyDialogProps) {
  const focusedMatch = focusMatchKey ? cache.matches.get(focusMatchKey) : undefined;
  const [tab, setTab] = useState<"words" | "usage">(focusedMatch ? "usage" : "words");
  const [query, setQuery] = useState("");
  const [quickEntry, setQuickEntry] = useState("");
  const [usageScope, setUsageScope] = useState<"tables" | "domains">(focusedMatch?.target === "domain" ? "domains" : "tables");
  const [selectedTableId, setSelectedTableId] = useState(focusedMatch?.target !== "domain" ? focusedMatch?.ownerId ?? seeds[0]?.id ?? "" : seeds[0]?.id ?? "");
  const [suggestions, setSuggestions] = useState<Record<string, VocabularySuggestion>>({});
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [registrationMatch, setRegistrationMatch] = useState<VocabularyMatch | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const visibleEntries = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return entries.filter((entry) => !normalized || [entry.businessName, entry.systemName, entry.physicalName, entry.meaning, entry.memo].some((value) => value.toLocaleLowerCase().includes(normalized)));
  }, [entries, query]);
  const usageMatches = useMemo(() => [...cache.matches.values()].filter((match) => usageScope === "domains" ? match.target === "domain" : match.ownerId === selectedTableId), [cache, selectedTableId, usageScope]);

  useEffect(() => {
    if (!focusMatchKey || tab !== "usage") return;
    const frame = requestAnimationFrame(() => document.getElementById(`vocabulary-usage-${focusMatchKey}`)?.scrollIntoView({ block: "center" }));
    return () => cancelAnimationFrame(frame);
  }, [focusMatchKey, tab, usageMatches]);

  const handleQuery = useCallback((event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value), []);
  const handleQuickEntryChange = useCallback((event: ChangeEvent<HTMLInputElement>) => setQuickEntry(event.target.value), []);
  const handleQuickEntryKeyDown = useCallback(async (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter" || event.nativeEvent.isComposing || event.keyCode === 229) return;
    event.preventDefault();
    const businessName = quickEntry.trim();
    if (!businessName) return;
    const created = await onCreateEntry({ id: crypto.randomUUID(), businessName, systemName: "", physicalName: "", meaning: "", memo: "", aliases: [] });
    if (created) setQuickEntry("");
  }, [onCreateEntry, quickEntry]);
  const handleTabClick = useCallback((event: MouseEvent<HTMLButtonElement>) => setTab(event.currentTarget.dataset.tab as "words" | "usage"), []);
  const handleScopeClick = useCallback((event: MouseEvent<HTMLButtonElement>) => setUsageScope(event.currentTarget.dataset.scope as "tables" | "domains"), []);
  const handleTableClick = useCallback((event: MouseEvent<HTMLButtonElement>) => setSelectedTableId(event.currentTarget.dataset.tableId ?? ""), []);

  const handleEntryCommit = useCallback(async (event: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const entry = entries.find((candidate) => candidate.id === event.currentTarget.dataset.entryId);
    const key = event.currentTarget.dataset.entryKey as keyof VocabularyEntry;
    if (!entry || !key) return;
    const value = key === "aliases" ? event.currentTarget.value.split(",").map((item) => item.trim()).filter(Boolean) : event.currentTarget.value;
    const next = { ...entry, [key]: value } as VocabularyEntry;
    const conflict = vocabularyTermConflict(entries, next);
    if (conflict) {
      window.alert(`“${conflict}” is already defined. The earlier vocabulary definition takes priority.`);
      event.currentTarget.value = key === "aliases" ? entry.aliases.join(", ") : String(entry[key]);
      return;
    }
    if (!(await onChangeEntry(next))) event.currentTarget.value = key === "aliases" ? entry.aliases.join(", ") : String(entry[key]);
  }, [entries, onChangeEntry]);
  const handleInputClick = useCallback((event: MouseEvent<HTMLElement>) => event.stopPropagation(), []);
  const handleDelete = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    const entry = entries.find((candidate) => candidate.id === event.currentTarget.dataset.entryId);
    if (entry && window.confirm(`Delete vocabulary term “${entry.businessName}”?`)) void onDeleteEntry(entry);
  }, [entries, onDeleteEntry]);
  const handleSuggest = useCallback(async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const entry = entries.find((candidate) => candidate.id === event.currentTarget.dataset.entryId);
    if (!entry) return;
    setPendingId(entry.id);
    const suggestion = await suggestVocabularyNames(entry.businessName, entries, entry.id);
    startTransition(() => { setSuggestions((current) => ({ ...current, [entry.id]: suggestion })); setPendingId(null); });
  }, [entries]);
  const handleApplySuggestion = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    const entry = entries.find((candidate) => candidate.id === event.currentTarget.dataset.entryId);
    const suggestion = entry ? suggestions[entry.id] : undefined;
    if (!entry || !suggestion) return;
    void onChangeEntry({ ...entry, systemName: suggestion.system, physicalName: suggestion.physical });
    setSuggestions((current) => { const next = { ...current }; delete next[entry.id]; return next; });
  }, [entries, onChangeEntry, suggestions]);
  const handleRegister = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    const match = cache.matches.get(event.currentTarget.dataset.matchKey ?? "");
    if (match) setRegistrationMatch(match);
  }, [cache]);
  const handleAliasReplace = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    const match = cache.matches.get(event.currentTarget.dataset.matchKey ?? "");
    const segmentIndex = Number(event.currentTarget.dataset.segmentIndex);
    if (match && Number.isInteger(segmentIndex)) void onAliasReplace(match, segmentIndex);
  }, [cache, onAliasReplace]);
  const closeRegistration = useCallback(() => setRegistrationMatch(null), []);
  const openSettings = useCallback(() => setSettingsOpen(true), []);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);

  return createPortal(
    <div className="dialog-overlay fixed inset-0 z-[90]">
      <div data-tour="vocabulary-dialog" role="dialog" aria-modal="true" aria-labelledby="vocabulary-title" className="fixed inset-x-[1.5vw] inset-y-[4vh] z-[90] m-auto h-[min(92vh,900px)] w-[min(97vw,1280px)] rounded-xl border border-slate-200 bg-white p-0 shadow-2xl">
        <GuidedTourTrigger tour="vocabulary" />
        <div className="flex h-full flex-col">
          <header className="flex items-center gap-4 border-b border-slate-200 px-6 py-4">
            <div><h2 id="vocabulary-title" className="text-xl font-bold">Vocabulary</h2><p className="text-sm text-slate-500">Project dictionary and read-only usage coverage</p></div>
            {indexing && <span className="badge badge-info ml-auto">Indexing names…</span>}
            <button type="button" className={`${indexing ? "" : "ml-auto "}btn btn-outline btn-sm gap-1`} onClick={openSettings}><Settings size={15} />Project settings</button>
            <GuidedTourButton tour="vocabulary" label="Vocabulary" compact />
            <button type="button" className="btn btn-ghost btn-square" aria-label="Close vocabulary" onClick={onClose}><X size={20} /></button>
          </header>
          <div data-tour="vocabulary-tabs" role="tablist" className="tabs tabs-border border-b border-slate-200 px-6">
            <button type="button" role="tab" data-tab="words" className={`tab ${tab === "words" ? "tab-active" : ""}`} onClick={handleTabClick}>Word list</button>
            <button type="button" role="tab" data-tab="usage" className={`tab ${tab === "usage" ? "tab-active" : ""}`} onClick={handleTabClick}>Usage</button>
          </div>
          {tab === "words" ? (
            <div className="flex min-h-0 flex-1 flex-col px-6 py-4">
              <div className="flex gap-3">
                <label data-tour="vocabulary-quick-entry" className="input input-bordered intent-add flex flex-1 items-center gap-2"><Plus size={15} /><input value={quickEntry} onChange={handleQuickEntryChange} onKeyDown={handleQuickEntryKeyDown} placeholder="Type business name and press Enter" /><kbd className="kbd kbd-sm">Enter</kbd></label>
                <input className="input input-bordered w-72" placeholder="Search word list" value={query} onChange={handleQuery} />
              </div>
              <div className="mt-4 min-h-0 flex-1 overflow-auto">
                <div className="grid grid-cols-[minmax(150px,1fr)_minmax(150px,1fr)_minmax(150px,1fr)_100px] gap-2 px-2 pb-2 text-xs font-bold uppercase text-slate-500"><span>Business</span><span>System</span><span>Physical</span><span>Assist</span></div>
                <div className="space-y-2">{visibleEntries.map((entry) => {
                  const suggestion = suggestions[entry.id];
                  return <details key={entry.id} className="rounded-lg border border-slate-200 p-2">
                    <summary className="grid cursor-pointer grid-cols-[minmax(150px,1fr)_minmax(150px,1fr)_minmax(150px,1fr)_100px] items-center gap-2">
                      <input data-entry-id={entry.id} data-entry-key="businessName" className="input input-sm input-bordered" defaultValue={entry.businessName} onBlur={handleEntryCommit} onClick={handleInputClick} />
                      <input data-entry-id={entry.id} data-entry-key="systemName" className="input input-sm input-bordered" defaultValue={entry.systemName} placeholder="Later" onBlur={handleEntryCommit} onClick={handleInputClick} />
                      <input data-entry-id={entry.id} data-entry-key="physicalName" className="input input-sm input-bordered font-mono" defaultValue={entry.physicalName} placeholder="Later" onBlur={handleEntryCommit} onClick={handleInputClick} />
                      <button type="button" data-entry-id={entry.id} className="btn btn-sm btn-outline gap-1" disabled={pendingId === entry.id} onClick={handleSuggest}><Sparkles size={14} />Suggest</button>
                    </summary>
                    {suggestion && <button type="button" data-entry-id={entry.id} className="mt-2 flex w-full rounded-md bg-violet-50 p-2 text-left text-sm" onClick={handleApplySuggestion}><strong data-i18n-skip>{suggestion.system}</strong><code data-i18n-skip className="ml-2">{suggestion.physical}</code><span className="ml-auto text-violet-700">Click to apply</span></button>}
                    <div className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
                      <label className="text-xs font-bold text-slate-600">Meaning<textarea data-entry-id={entry.id} data-entry-key="meaning" className="textarea textarea-bordered mt-1 w-full font-normal" defaultValue={entry.meaning} onBlur={handleEntryCommit} /></label>
                      <label className="text-xs font-bold text-slate-600">Memo<textarea data-entry-id={entry.id} data-entry-key="memo" className="textarea textarea-bordered mt-1 w-full font-normal" defaultValue={entry.memo} onBlur={handleEntryCommit} /></label>
                      <label className="text-xs font-bold text-slate-600">Aliases (comma separated)<input data-entry-id={entry.id} data-entry-key="aliases" className="input input-sm input-bordered mt-1 w-full font-normal" defaultValue={entry.aliases.join(", ")} onBlur={handleEntryCommit} /></label>
                      <div className="flex items-end justify-between"><span className="text-xs text-slate-500">Used in {cache.entryUsage.get(entry.id)?.length ?? 0} names</span><button type="button" data-entry-id={entry.id} className="btn btn-sm btn-ghost text-red-600" onClick={handleDelete}>Delete</button></div>
                      <div className="col-span-2 rounded-md bg-slate-50 p-2"><p className="text-xs font-bold text-slate-600">Usage list</p><div className="mt-1 flex flex-wrap gap-1">{(cache.entryUsage.get(entry.id) ?? []).map((key) => { const usage = cache.matches.get(key); return <span key={key} className="badge badge-ghost">{usage?.target}: {usage?.ownerLabel}</span>; })}{(cache.entryUsage.get(entry.id)?.length ?? 0) === 0 && <span className="text-xs text-slate-400">Not used yet</span>}</div></div>
                    </div>
                  </details>;
                })}</div>
              </div>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1">
              <aside className="w-64 border-r border-slate-200 p-4">
                <div className="grid grid-cols-2 rounded-lg bg-slate-100 p-1"><button type="button" data-scope="tables" className={`rounded p-2 text-xs font-bold ${usageScope === "tables" ? "bg-white shadow" : ""}`} onClick={handleScopeClick}>Tables</button><button type="button" data-scope="domains" className={`rounded p-2 text-xs font-bold ${usageScope === "domains" ? "bg-white shadow" : ""}`} onClick={handleScopeClick}>Domains</button></div>
                {usageScope === "tables" && <div role="listbox" aria-label="Project tables" className="mt-4 max-h-[min(60vh,560px)] space-y-1 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1">{seeds.map((seed) => { const selected = seed.id === selectedTableId; return <button data-i18n-skip key={seed.id} type="button" role="option" aria-selected={selected} data-table-id={seed.id} className={`flex w-full items-center rounded-md px-3 py-2 text-left text-sm transition-colors ${selected ? "bg-blue-100 font-bold text-blue-950" : "text-slate-700 hover:bg-slate-100"}`} onClick={handleTableClick}>{seed.names?.business || seed.title}</button>; })}{seeds.length === 0 && <p className="px-3 py-6 text-center text-xs text-slate-400">No tables</p>}</div>}
                {usageScope === "domains" && <p className="mt-4 text-sm text-slate-500">All project domains</p>}
              </aside>
              <div className="min-w-0 flex-1 overflow-auto p-5">
                <div className="grid grid-cols-[120px_minmax(160px,1fr)_minmax(160px,1fr)_minmax(160px,1fr)_110px] gap-2 border-b border-slate-200 px-2 pb-2 text-xs font-bold uppercase text-slate-500"><span>Status</span><span>Business</span><span>System</span><span>Physical</span><span>Action</span></div>
                {usageMatches.map((match) => { const meta = statusMeta[match.status]; const alias = match.aliasMatches[0]; const focused = focusMatchKey === match.key; return <div id={`vocabulary-usage-${match.key}`} key={match.key} className={`grid grid-cols-[120px_minmax(160px,1fr)_minmax(160px,1fr)_minmax(160px,1fr)_110px] items-center gap-2 border-b border-slate-100 px-2 py-3 text-sm ${focused ? "bg-red-50 ring-1 ring-inset ring-red-200" : ""}`}><span className={`flex items-center gap-1 font-bold ${meta.className}`}><meta.Icon size={16} />{meta.label}</span><span><VocabularyDisplayName cache={cache} cacheKey={match.key} legacyName={match.sourceText} mode="business" navigable={false} /></span><span><VocabularyDisplayName cache={cache} cacheKey={match.key} legacyName={match.sourceText} mode="system" navigable={false} /></span><code><VocabularyDisplayName cache={cache} cacheKey={match.key} legacyName={match.sourceText} mode="physical" navigable={false} /></code><span>{match.status === "unmatched" && <button type="button" data-match-key={match.key} className="btn btn-xs btn-outline" aria-label={`Register vocabulary for ${match.names.business}`} onClick={handleRegister}>Register</button>}{match.status === "correction_required" && alias && <button type="button" data-match-key={match.key} data-segment-index={alias.segmentIndex} className="btn btn-xs btn-error btn-outline" title={`Replace “${alias.alias}” with “${alias.preferred}”`} onClick={handleAliasReplace}>Use <span data-i18n-skip>{alias.preferred}</span></button>}</span></div>; })}
              </div>
            </div>
          )}
        </div>
      </div>
      {registrationMatch && <VocabularyRegistrationDialog match={registrationMatch} entries={entries} onCreateEntry={onCreateEntry} onBindingChange={onBindingChange} onClose={closeRegistration} />}
      {settingsOpen && <ProjectSettingsDialog policy={namingPolicy} onChange={onNamingPolicyChange} onClose={closeSettings} />}
    </div>, document.body
  );
}
