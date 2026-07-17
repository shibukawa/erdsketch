import { useCallback, useMemo, useState, type ChangeEvent, type FormEvent, type MouseEvent } from "react";
import type { VocabularyBinding, VocabularyEntry } from "../../features/modeling/types";
import type { VocabularyMatch } from "../../features/modeling/vocabulary";
import { GuidedTourButton } from "../guidedTour/GuidedTourButton";
import { GuidedTourTrigger } from "../guidedTour/GuidedTourTrigger";

type VocabularyRegistrationDialogProps = { match: VocabularyMatch; entries: VocabularyEntry[]; onCreateEntry: (entry: VocabularyEntry) => Promise<boolean>; onBindingChange: (match: VocabularyMatch, binding: VocabularyBinding) => Promise<boolean>; onClose: () => void };

export function VocabularyRegistrationDialog({ match, entries, onCreateEntry, onBindingChange, onClose }: VocabularyRegistrationDialogProps) {
  const initial = match.sourceText.includes(" ") ? match.sourceText.split(/\s+/).join("|") : match.sourceText;
  const [segmentation, setSegmentation] = useState(initial);
  const [saving, setSaving] = useState(false);
  const segments = useMemo(() => segmentation.split("|").map((item) => item.trim()).filter(Boolean), [segmentation]);
  const [selectedIndexes, setSelectedIndexes] = useState<Set<number>>(() => new Set(initial.split("|").map((_, index) => index)));
  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSegmentation(value);
    setSelectedIndexes(new Set(value.split("|").map((_, index) => index)));
  }, []);
  const handleSegmentToggle = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    const index = Number(event.currentTarget.dataset.index);
    setSelectedIndexes((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index); else next.add(index);
      return next;
    });
  }, []);
  const handleSubmit = useCallback(async (event: FormEvent) => {
    event.preventDefault();
    if (segments.length === 0 || selectedIndexes.size === 0) return;
    setSaving(true);
    const bindingSegments: VocabularyBinding["segments"] = [];
    let sourceOffset = 0;
    const lowerSource = match.sourceText.toLocaleLowerCase();
    const knownEntries = [...entries];
    for (const [index, segment] of segments.entries()) {
      const foundAt = lowerSource.indexOf(segment.toLocaleLowerCase(), sourceOffset);
      if (foundAt > sourceOffset) bindingSegments.push({ type: "unmatched", text: match.sourceText.slice(sourceOffset, foundAt) });
      const source = foundAt >= 0 ? match.sourceText.slice(foundAt, foundAt + segment.length) : segment;
      if (selectedIndexes.has(index)) {
        let entry = knownEntries.find((candidate) => candidate.businessName.toLocaleLowerCase() === segment.toLocaleLowerCase());
        if (!entry) {
          entry = { id: crypto.randomUUID(), businessName: segment, systemName: "", physicalName: "", meaning: "", memo: "", aliases: [] };
          if (!(await onCreateEntry(entry))) { setSaving(false); return; }
          knownEntries.push(entry);
        }
        bindingSegments.push({ type: "entry", entryId: entry.id, source });
      } else {
        bindingSegments.push({ type: "unmatched", text: source });
      }
      sourceOffset = foundAt >= 0 ? foundAt + segment.length : sourceOffset;
    }
    if (sourceOffset < match.sourceText.length) bindingSegments.push({ type: "unmatched", text: match.sourceText.slice(sourceOffset) });
    const saved = await onBindingChange(match, { sourceText: match.sourceText, segments: bindingSegments, manual: true });
    setSaving(false);
    if (saved) onClose();
  }, [entries, match, onBindingChange, onClose, onCreateEntry, segments, selectedIndexes]);
  return <div data-tour="vocabulary-registration" role="dialog" aria-modal="true" aria-labelledby="vocabulary-registration-title" className="dialog-overlay fixed inset-0 z-[100] flex items-center justify-center p-4">
    <GuidedTourTrigger tour="vocabulary-registration" />
    <form className="w-[min(92vw,720px)] rounded-xl border border-slate-200 bg-white shadow-2xl" onSubmit={handleSubmit}>
      <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4"><div><h3 id="vocabulary-registration-title" className="text-lg font-bold">Register unmatched vocabulary</h3><p className="text-sm text-slate-500">Insert <code>|</code> where each dictionary entry should be split.</p></div><GuidedTourButton tour="vocabulary-registration" label="Vocabulary registration" compact /></header>
      <div className="p-5"><p className="mb-2 text-sm"><strong>Source:</strong> {match.sourceText}</p><input data-tour="vocabulary-segmentation" autoFocus className="input input-bordered w-full text-lg" value={segmentation} onChange={handleChange} aria-label="Vocabulary segmentation" /><div data-tour="vocabulary-segments" className="mt-4 flex flex-wrap gap-2">{segments.map((segment, index) => <button type="button" key={`${segment}-${index}`} data-index={index} className={`badge badge-lg ${selectedIndexes.has(index) ? "badge-primary" : "badge-outline"}`} aria-pressed={selectedIndexes.has(index)} onClick={handleSegmentToggle}>{segment}</button>)}</div><p className="mt-3 text-xs text-slate-500">Selected segments will be registered. Click a segment to leave it unmatched.</p><p className="mt-1 text-xs text-slate-500">Remove all separators to register the whole phrase. Add separators freely for Japanese, Chinese, Korean, or multi-word groups.</p></div>
      <footer className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4"><button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button><button data-tour="vocabulary-register" type="submit" className="btn btn-primary" disabled={saving || selectedIndexes.size === 0}>{saving ? "Registering…" : "Register selected"}</button></footer>
    </form>
  </div>;
}
