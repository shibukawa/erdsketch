import { Settings, X } from "lucide-react";
import { startTransition, useEffect, useState, type ChangeEvent, type FocusEvent, type KeyboardEvent, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { suggestVocabularyNames, type VocabularySuggestion } from "../../features/modeling/browserAi";
import type { DataDomain, ModelSeed, NamingPolicy, VocabularyBinding, VocabularyEntry } from "../../features/modeling/types";
import { fillMissingVocabularyName, vocabularyTermConflict, type VocabularyAutofillTarget, type VocabularyMatch, type VocabularyMatchCache } from "../../features/modeling/vocabulary";
import { useI18n } from "../../i18n/I18nProvider";
import { GuidedTourButton } from "../guidedTour/GuidedTourButton";
import { GuidedTourTrigger } from "../guidedTour/GuidedTourTrigger";
import { ProjectSettingsDialog } from "./ProjectSettingsDialog";
import { VocabularyEntrySidebar } from "./VocabularyEntrySidebar";
import { VocabularyRegistrationDialog } from "./VocabularyRegistrationDialog";
import { VocabularyUsageList } from "./VocabularyUsageList";
import { VocabularyWordList } from "./VocabularyWordList";

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

export function VocabularyDialog({ seeds, domains, entries, cache, indexing, namingPolicy, onNamingPolicyChange, onCreateEntry, onChangeEntry, onDeleteEntry, onBindingChange, onAliasReplace, focusMatchKey, onClose }: VocabularyDialogProps) {
  const { locale } = useI18n();
  const focusedMatch = focusMatchKey ? cache.matches.get(focusMatchKey) : undefined;
  const [tab, setTab] = useState<"words" | "usage">(focusedMatch ? "usage" : "words");
  const [query, setQuery] = useState("");
  const [quickEntry, setQuickEntry] = useState("");
  const [creating, setCreating] = useState(false);
  const [bulkEditing, setBulkEditing] = useState(false);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [usageScope, setUsageScope] = useState<"tables" | "domains">(focusedMatch?.target === "domain" ? "domains" : "tables");
  const [selectedTableId, setSelectedTableId] = useState(focusedMatch?.target !== "domain" ? focusedMatch?.ownerId ?? seeds[0]?.id ?? "" : seeds[0]?.id ?? "");
  const [suggestions, setSuggestions] = useState<Record<string, VocabularySuggestion>>({});
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [autofillPending, setAutofillPending] = useState<VocabularyAutofillTarget | null>(null);
  const [registrationMatch, setRegistrationMatch] = useState<VocabularyMatch | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const selectedEntry = entries.find((entry) => entry.id === selectedEntryId);
  const usageMatches = [...cache.matches.values()].filter((match) => usageScope === "domains" ? match.target === "domain" : match.ownerId === selectedTableId);

  useEffect(() => {
    if (!focusMatchKey || tab !== "usage") return;
    const frame = requestAnimationFrame(() => document.getElementById(`vocabulary-usage-${focusMatchKey}`)?.scrollIntoView({ block: "center" }));
    return () => cancelAnimationFrame(frame);
  }, [focusMatchKey, tab, usageMatches]);

  function handleQuery(event: ChangeEvent<HTMLInputElement>) {
    setQuery(event.target.value);
  }

  function handleQuickEntryChange(event: ChangeEvent<HTMLInputElement>) {
    setQuickEntry(event.target.value);
  }

  async function handleQuickEntryKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setCreating(false);
      setQuickEntry("");
      return;
    }
    if (event.key !== "Enter" || event.nativeEvent.isComposing || event.keyCode === 229) return;
    event.preventDefault();
    const businessName = quickEntry.trim();
    if (!businessName) return;
    const entry: VocabularyEntry = { id: crypto.randomUUID(), businessName, systemName: "", physicalName: "", meaning: "", memo: "", aliases: [] };
    if (await onCreateEntry(entry)) {
      setQuickEntry("");
      setCreating(false);
      setSelectedEntryId(entry.id);
    }
  }

  function handleTabClick(event: MouseEvent<HTMLButtonElement>) {
    setTab(event.currentTarget.dataset.tab as "words" | "usage");
  }

  function handleScopeClick(event: MouseEvent<HTMLButtonElement>) {
    setUsageScope(event.currentTarget.dataset.scope as "tables" | "domains");
  }

  function handleTableClick(event: MouseEvent<HTMLButtonElement>) {
    setSelectedTableId(event.currentTarget.dataset.tableId ?? "");
  }

  async function handleEntryCommit(event: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
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
  }

  function handleDelete(entry: VocabularyEntry) {
    if (!window.confirm(`Delete vocabulary term “${entry.businessName}”?`)) return;
    void onDeleteEntry(entry).then((deleted) => { if (deleted) setSelectedEntryId(null); });
  }

  async function handleAutofill(target: VocabularyAutofillTarget) {
    const changes = entries.map((entry) => fillMissingVocabularyName(entry, target)).filter((entry, index) => entry !== entries[index]);
    if (changes.length === 0) return;
    setAutofillPending(target);
    try {
      await Promise.all(changes.map((entry) => onChangeEntry(entry)));
    } finally {
      setAutofillPending(null);
    }
  }

  async function handleSuggest(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    const entry = entries.find((candidate) => candidate.id === event.currentTarget.dataset.entryId);
    if (!entry) return;
    setPendingId(entry.id);
    const suggestion = await suggestVocabularyNames(entry.businessName, entries, entry.id);
    startTransition(() => {
      setSuggestions((current) => ({ ...current, [entry.id]: suggestion }));
      setPendingId(null);
    });
  }

  function handleApplySuggestion(event: MouseEvent<HTMLButtonElement>) {
    const entry = entries.find((candidate) => candidate.id === event.currentTarget.dataset.entryId);
    const suggestion = entry ? suggestions[entry.id] : undefined;
    if (!entry || !suggestion) return;
    void onChangeEntry({ ...entry, systemName: suggestion.system, physicalName: suggestion.physical });
    setSuggestions((current) => {
      const next = { ...current };
      delete next[entry.id];
      return next;
    });
  }

  function handleRegister(event: MouseEvent<HTMLButtonElement>) {
    const match = cache.matches.get(event.currentTarget.dataset.matchKey ?? "");
    if (match) setRegistrationMatch(match);
  }

  function handleAliasReplace(event: MouseEvent<HTMLButtonElement>) {
    const match = cache.matches.get(event.currentTarget.dataset.matchKey ?? "");
    const segmentIndex = Number(event.currentTarget.dataset.segmentIndex);
    if (match && Number.isInteger(segmentIndex)) void onAliasReplace(match, segmentIndex);
  }

  return createPortal(
    <div className="dialog-overlay fixed inset-0 z-[90]">
      <div data-tour="vocabulary-dialog" role="dialog" aria-modal="true" aria-labelledby="vocabulary-title" className="fixed inset-x-[1.5vw] inset-y-[4vh] z-[90] m-auto h-[min(92vh,900px)] w-[min(97vw,1280px)] rounded-xl border border-slate-200 bg-white p-0 shadow-2xl">
        <GuidedTourTrigger tour="vocabulary" />
        <div className="flex h-full flex-col">
          <header className="flex items-center gap-4 border-b border-slate-200 px-6 py-4">
            <div><h2 id="vocabulary-title" className="text-xl font-bold">Vocabulary</h2><p className="text-sm text-slate-500">Project dictionary and read-only usage coverage</p></div>
            {indexing && <span className="badge badge-info ml-auto">Indexing names…</span>}
            <button type="button" className={`${indexing ? "" : "ml-auto "}btn btn-outline btn-sm gap-1`} onClick={() => setSettingsOpen(true)}><Settings size={15} />Project settings</button>
            <GuidedTourButton tour="vocabulary" label="Vocabulary" compact />
            <button type="button" className="btn btn-ghost btn-square" aria-label="Close vocabulary" onClick={onClose}><X size={20} /></button>
          </header>
          <div data-tour="vocabulary-tabs" role="tablist" className="tabs tabs-border border-b border-slate-200 px-6">
            <button type="button" role="tab" data-tab="words" className={`tab ${tab === "words" ? "tab-active" : ""}`} onClick={handleTabClick}>Word list</button>
            <button type="button" role="tab" data-tab="usage" className={`tab ${tab === "usage" ? "tab-active" : ""}`} onClick={handleTabClick}>Usage</button>
          </div>
          {tab === "words" ? <div className="flex min-h-0 flex-1">
            <VocabularyWordList entries={entries} query={query} selectedEntryId={selectedEntryId} bulkEditing={bulkEditing} creating={creating} quickEntry={quickEntry} language={locale} suggestions={suggestions} pendingId={pendingId} autofillPending={autofillPending} onQueryChange={handleQuery} onQuickEntryChange={handleQuickEntryChange} onQuickEntryKeyDown={handleQuickEntryKeyDown} onStartCreating={() => setCreating(true)} onCancelCreating={() => { setCreating(false); setQuickEntry(""); }} onToggleBulkEditing={() => setBulkEditing((current) => !current)} onSelectEntry={setSelectedEntryId} onEntryCommit={handleEntryCommit} onSuggest={handleSuggest} onApplySuggestion={handleApplySuggestion} onAutofill={handleAutofill} />
            {selectedEntry && !bulkEditing && <VocabularyEntrySidebar entry={selectedEntry} cache={cache} language={locale} onCommit={handleEntryCommit} onDelete={handleDelete} onClose={() => setSelectedEntryId(null)} />}
          </div> : <VocabularyUsageList seeds={seeds} domains={domains} cache={cache} matches={usageMatches} scope={usageScope} selectedTableId={selectedTableId} focusMatchKey={focusMatchKey} onScopeClick={handleScopeClick} onTableClick={handleTableClick} onRegister={handleRegister} onAliasReplace={handleAliasReplace} />}
        </div>
      </div>
      {registrationMatch && <VocabularyRegistrationDialog match={registrationMatch} entries={entries} onCreateEntry={onCreateEntry} onBindingChange={onBindingChange} onClose={() => setRegistrationMatch(null)} />}
      {settingsOpen && <ProjectSettingsDialog policy={namingPolicy} onChange={onNamingPolicyChange} onClose={() => setSettingsOpen(false)} />}
    </div>, document.body
  );
}
