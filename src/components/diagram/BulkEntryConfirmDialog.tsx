import { CheckSquare, PencilLine, Square, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type MouseEvent, type SyntheticEvent } from "react";
import { createPortal } from "react-dom";
import { evaluateBulkEntryNames, type BulkEntryEvaluation } from "../../features/modeling/bulkEntry";

export type BulkEntryCandidate = {
  id: string;
  value: string;
  selected: boolean;
};

type BulkEntryConfirmDialogProps = {
  title: string;
  description: string;
  confirmLabel: string;
  occupiedNames: string[];
  initialCandidates: BulkEntryCandidate[];
  note?: string;
  onConfirm: (names: string[]) => Promise<void> | void;
  onClose: () => void;
};

type CandidateView = BulkEntryCandidate & BulkEntryEvaluation;

function buildCandidates(candidates: BulkEntryCandidate[], occupiedNames: string[]): CandidateView[] {
  const evaluations = evaluateBulkEntryNames(candidates.map((candidate) => candidate.value), occupiedNames);
  return candidates.map((candidate, index) => ({ ...candidate, ...evaluations[index] }));
}

export function BulkEntryConfirmDialog({ title, description, confirmLabel, occupiedNames, initialCandidates, note, onConfirm, onClose }: BulkEntryConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [candidates, setCandidates] = useState(initialCandidates);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const candidateViews = useMemo(() => buildCandidates(candidates, occupiedNames), [candidates, occupiedNames]);
  const selectedReadyNames = useMemo(
    () => candidateViews.filter((candidate) => candidate.selected && candidate.status === "ready").map((candidate) => candidate.normalizedName),
    [candidateViews]
  );
  const readyCount = candidateViews.filter((candidate) => candidate.status === "ready").length;

  const handleCancel = useCallback((event: SyntheticEvent<HTMLDialogElement>) => {
    event.preventDefault();
    if (!saving) onClose();
  }, [onClose, saving]);

  const handleBackdropClick = useCallback((event: MouseEvent<HTMLDialogElement>) => {
    if (!saving && event.target === event.currentTarget) onClose();
  }, [onClose, saving]);

  const handleToggle = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const candidateId = event.target.dataset.candidateId;
    const checked = event.target.checked;
    setCandidates((current) => current.map((candidate) => candidate.id === candidateId ? { ...candidate, selected: checked } : candidate));
  }, []);

  const handleValueChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const candidateId = event.target.dataset.candidateId;
    const value = event.target.value;
    setCandidates((current) => current.map((candidate) => candidate.id === candidateId ? { ...candidate, value } : candidate));
  }, []);

  const handleSelectAddable = useCallback(() => {
    setCandidates((current) => buildCandidates(current, occupiedNames).map((candidate) => ({ ...candidate, selected: candidate.status === "ready" })));
  }, [occupiedNames]);

  const handleClear = useCallback(() => {
    setCandidates((current) => current.map((candidate) => ({ ...candidate, selected: false })));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (selectedReadyNames.length === 0) return;
    setSaving(true);
    await onConfirm(selectedReadyNames);
    setSaving(false);
    onClose();
  }, [onClose, onConfirm, selectedReadyNames]);

  return createPortal(
    <dialog
      ref={dialogRef}
      className="m-auto w-[min(94vw,820px)] rounded-xl border border-slate-200 bg-white p-0 text-slate-950 shadow-2xl"
      aria-labelledby="bulk-entry-confirm-title"
      onCancel={handleCancel}
      onClick={handleBackdropClick}
    >
      <div className="flex max-h-[min(86vh,760px)] flex-col overflow-hidden">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 id="bulk-entry-confirm-title" className="text-lg font-bold">{title}</h2>
            <p className="mt-1 text-sm text-slate-600">{description}</p>
            <p className="mt-2 text-xs font-semibold text-slate-500">{selectedReadyNames.length} selected / {readyCount} addable</p>
            {note && <p className="mt-1 text-xs text-slate-500">{note}</p>}
          </div>
          <button type="button" className="btn btn-ghost btn-sm btn-square" onClick={onClose} disabled={saving} aria-label="Close">
            <X size={17} />
          </button>
        </header>
        <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-3">
          <button type="button" className="btn btn-outline btn-sm gap-2" onClick={handleSelectAddable} disabled={saving}>
            <CheckSquare size={15} />Select addable
          </button>
          <button type="button" className="btn btn-outline btn-sm gap-2" onClick={handleClear} disabled={saving}>
            <Square size={15} />Clear
          </button>
        </div>
        <div className="overflow-auto px-5 py-4">
          <div className="space-y-2">
            {candidateViews.map((candidate, index) => {
              const disabled = candidate.status !== "ready";
              return <div key={candidate.id} className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border px-3 py-2 ${disabled ? "border-slate-200 bg-slate-50" : "border-blue-100 bg-white"}`}>
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm"
                  checked={candidate.selected && !disabled}
                  disabled={disabled || saving}
                  data-candidate-id={candidate.id}
                  aria-label={`Select row ${index + 1}`}
                  onChange={handleToggle}
                />
                <label className="flex min-w-0 items-center gap-2">
                  <PencilLine size={15} className="shrink-0 text-slate-400" />
                  <input
                    type="text"
                    className="input input-bordered input-sm min-w-0 flex-1"
                    value={candidate.value}
                    data-candidate-id={candidate.id}
                    aria-label={`Candidate ${index + 1}`}
                    disabled={saving}
                    onChange={handleValueChange}
                  />
                </label>
                <span className={`text-xs font-semibold ${candidate.status === "ready" ? "text-emerald-700" : candidate.status === "existing" || candidate.status === "duplicate" ? "text-amber-700" : "text-slate-500"}`}>
                  {candidate.status === "ready" ? "Add" : candidate.reason}
                </span>
              </div>;
            })}
          </div>
        </div>
        <footer className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={saving || selectedReadyNames.length === 0}>{saving ? "Adding…" : confirmLabel}</button>
        </footer>
      </div>
    </dialog>,
    document.body
  );
}