import { Trash2, X } from "lucide-react";
import { useEffect, useOptimistic, useRef, useState, useTransition, type ChangeEvent, type FocusEvent } from "react";
import type { VocabularyEntry } from "../../features/modeling/types";
import type { VocabularyMatchCache } from "../../features/modeling/vocabulary";

type VocabularyEntrySidebarProps = {
  entry: VocabularyEntry;
  cache: VocabularyMatchCache;
  language: "en" | "ja";
  onCommit: (event: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onValueCommit: (entryId: string, key: keyof VocabularyEntry, value: string) => Promise<boolean>;
  onDelete: (entry: VocabularyEntry) => void;
  onClose: () => void;
};

function VocabularyNotesEditor({ entry, onCommit }: { entry: VocabularyEntry; onCommit: VocabularyEntrySidebarProps["onValueCommit"] }) {
  const [pending, startCommitTransition] = useTransition();
  const [optimisticMemo, addOptimisticMemo] = useOptimistic(entry.memo, (_current, next: string) => next);
  const [draft, setDraft] = useState(entry.memo);
  const editingRef = useRef(false);

  useEffect(() => {
    if (!editingRef.current) setDraft(optimisticMemo);
  }, [optimisticMemo]);

  function handleFocus() {
    editingRef.current = true;
    setDraft(optimisticMemo);
  }

  function handleChange(event: ChangeEvent<HTMLTextAreaElement>) {
    setDraft(event.target.value);
  }

  function handleBlur(event: FocusEvent<HTMLTextAreaElement>) {
    editingRef.current = false;
    const next = event.currentTarget.value;
    if (next === entry.memo) return;
    startCommitTransition(async () => {
      addOptimisticMemo(next);
      if (!(await onCommit(entry.id, "memo", next))) setDraft(entry.memo);
    });
  }

  return <textarea data-i18n-skip className="textarea textarea-bordered mt-1 min-h-24 w-full bg-white font-normal" value={draft} aria-busy={pending} onFocus={handleFocus} onChange={handleChange} onBlur={handleBlur} />;
}

export function VocabularyEntrySidebar({ entry, cache, language, onCommit, onValueCommit, onDelete, onClose }: VocabularyEntrySidebarProps) {
  const usageKeys = cache.entryUsage.get(entry.id) ?? [];

  function handleDelete() {
    onDelete(entry);
  }

  return <aside className="flex w-[min(38vw,430px)] shrink-0 flex-col border-l border-slate-200 bg-slate-50/70" aria-label={`Details for ${entry.businessName}`}>
    <header className="flex items-start justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4">
      <div className="min-w-0"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Term details</p><h3 data-i18n-skip className="mt-1 truncate text-lg font-bold">{entry.businessName}</h3></div>
      <button type="button" className="btn btn-ghost btn-square btn-sm" aria-label="Close term details" onClick={onClose}><X size={17} /></button>
    </header>
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
      <label className="block text-xs font-bold text-slate-600">Business name<input key={`${entry.id}:business`} data-i18n-skip data-entry-id={entry.id} data-entry-key="businessName" className="input input-bordered mt-1 w-full bg-white font-normal" defaultValue={entry.businessName} spellCheck lang={language} onBlur={onCommit} /></label>
      <label className="block text-xs font-bold text-slate-600">System name<input key={`${entry.id}:system`} data-i18n-skip data-entry-id={entry.id} data-entry-key="systemName" className="input input-bordered mt-1 w-full bg-white font-normal" defaultValue={entry.systemName} spellCheck lang={language} onBlur={onCommit} /></label>
      <label className="block text-xs font-bold text-slate-600">Physical name<input key={`${entry.id}:physical`} data-i18n-skip data-entry-id={entry.id} data-entry-key="physicalName" className="input input-bordered mt-1 w-full bg-white font-mono font-normal" defaultValue={entry.physicalName} spellCheck={false} onBlur={onCommit} /></label>
      <label className="block text-xs font-bold text-slate-600">Meaning<textarea key={`${entry.id}:meaning`} data-i18n-skip data-entry-id={entry.id} data-entry-key="meaning" className="textarea textarea-bordered mt-1 min-h-24 w-full bg-white font-normal" defaultValue={entry.meaning} onBlur={onCommit} /></label>
      <label className="block text-xs font-bold text-slate-600">Notes<VocabularyNotesEditor key={entry.id} entry={entry} onCommit={onValueCommit} /></label>
      <label className="block text-xs font-bold text-slate-600">Aliases<input key={`${entry.id}:aliases`} data-i18n-skip data-entry-id={entry.id} data-entry-key="aliases" className="input input-bordered mt-1 w-full bg-white font-normal" defaultValue={entry.aliases.join(", ")} aria-describedby="vocabulary-alias-help" onBlur={onCommit} /><span id="vocabulary-alias-help" className="mt-1 block font-normal text-slate-400">Separate alternate wording with commas.</span></label>
      <section className="rounded-lg border border-slate-200 bg-white p-3"><p className="text-xs font-bold text-slate-600">Usage</p><div className="mt-2 flex flex-wrap gap-1">{usageKeys.map((key) => { const usage = cache.matches.get(key); return <span data-i18n-skip key={key} className="badge badge-ghost">{usage?.target}: {usage?.ownerLabel}</span>; })}{usageKeys.length === 0 && <span className="text-xs text-slate-400">Not used yet</span>}</div></section>
    </div>
    <footer className="flex items-center border-t border-slate-200 bg-white px-5 py-4">
      <button type="button" className="btn btn-ghost btn-sm ml-auto gap-1 text-red-600" onClick={handleDelete}><Trash2 size={14} />Delete</button>
    </footer>
  </aside>;
}
