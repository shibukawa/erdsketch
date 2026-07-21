import { ArrowLeftRight, Link2, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ChangeEvent, type MouseEvent, type SyntheticEvent } from "react";
import { createPortal } from "react-dom";
import type { ModelSeed, Multiplicity, Relationship, RelationshipDirection, RelationshipKind } from "../../features/modeling/types";
import { normalizeRelationshipSemantics, relationshipForeignKeyNullable, upgradeLegacyHistoryRelationship } from "../../features/modeling/utils";

const multiplicities: Multiplicity[] = ["0..1", "1", "0..*", "1..*"];

type RelationshipEditorDialogProps = {
  relationship: Relationship;
  source?: ModelSeed;
  target?: ModelSeed;
  canDelete: boolean;
  onSave: (relationship: Relationship) => void;
  onDelete: () => void;
  onClose: () => void;
};

export function RelationshipEditorDialog({ relationship, source, target, canDelete, onSave, onDelete, onClose }: RelationshipEditorDialogProps) {
  const [draft, setDraft] = useState<Relationship>(() => normalizeRelationshipSemantics(upgradeLegacyHistoryRelationship({ ...relationship, kind: relationship.kind ?? "foreign-key" }, source, target)));
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const endpointModels = [source, target];
  const draftSource = endpointModels.find((model) => model?.id === draft.sourceId);
  const draftTarget = endpointModels.find((model) => model?.id === draft.targetId);
  const isSaveDisabled = !draft.name.trim() || (draft.onDelete === "set_null" && !relationshipForeignKeyNullable(draft));

  useEffect(() => {
    setDraft(normalizeRelationshipSemantics(upgradeLegacyHistoryRelationship({ ...relationship, kind: relationship.kind ?? "foreign-key" }, source, target)));
  }, [relationship, source, target]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const handleNameChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setDraft((current) => ({ ...current, name: event.target.value }));
  }, []);
  const handleSourceMultiplicity = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    setDraft((current) => ({ ...current, sourceMultiplicity: event.target.value as Multiplicity }));
  }, []);
  const handleTargetMultiplicity = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    setDraft((current) => ({ ...current, targetMultiplicity: event.target.value as Multiplicity }));
  }, []);
  const handleKindChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    const kind = event.target.value as RelationshipKind;
    setDraft((current) => normalizeRelationshipSemantics({ ...current, kind }));
  }, []);
  const handleOnDeleteChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    setDraft((current) => ({ ...current, onDelete: event.target.value as Relationship["onDelete"] }));
  }, []);
  const handleDirection = useCallback(() => {
    setDraft((current) => ({
      ...current,
      direction: (current.direction === "source-to-target" ? "target-to-source" : "source-to-target") as RelationshipDirection
    }));
  }, []);
  const handleDirectionSelect = useCallback((direction: RelationshipDirection) => {
    setDraft((current) => ({ ...current, direction }));
  }, []);
  const handleSourceToTarget = useCallback(() => {
    handleDirectionSelect("source-to-target");
  }, [handleDirectionSelect]);
  const handleTargetToSource = useCallback(() => {
    handleDirectionSelect("target-to-source");
  }, [handleDirectionSelect]);
  const handleSubmit = useCallback(
    (event: SyntheticEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (isSaveDisabled) return;
      onSave(normalizeRelationshipSemantics(draft));
    },
    [draft, isSaveDisabled, onSave]
  );
  const handleDelete = useCallback(() => {
    if (window.confirm(`Delete the “${relationship.name || "unnamed"}” relationship? Its relationship link will also disappear.`)) onDelete();
  }, [onDelete, relationship.name]);
  const handleCancel = useCallback((event: SyntheticEvent<HTMLDialogElement>) => {
    event.preventDefault();
    onClose();
  }, [onClose]);
  const handleBackdropClick = useCallback((event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) onClose();
  }, [onClose]);

  return createPortal(
    <dialog ref={dialogRef} className="field-list-dialog m-auto w-[min(94vw,560px)] rounded-xl border border-slate-200 bg-white p-0 text-slate-950 shadow-2xl" aria-labelledby="relationship-editor-title" onCancel={handleCancel} onClick={handleBackdropClick}>
      <form onSubmit={handleSubmit}>
        <header className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-blue-600">Semantic relationship</p>
            <h2 id="relationship-editor-title" className="mt-1 text-xl font-bold">Edit relationship</h2>
          </div>
          <button type="button" className="btn btn-ghost btn-sm btn-square" aria-label="Close relationship editor" onClick={onClose}><X size={18} /></button>
        </header>
        <div className="space-y-5 px-5 py-5">
          <label className="block">
            <span className="text-sm font-bold text-slate-700">Name <span className="text-red-700">※required</span></span>
            <input autoFocus className="input input-bordered mt-2 w-full" value={draft.name} onChange={handleNameChange} placeholder="e.g. ownership" />
          </label>
          <div>
            <label className="block">
              <span className="text-sm font-bold text-slate-700">Reference kind</span>
              <select className="select select-bordered mt-2 w-full" value={draft.kind} onChange={handleKindChange}>
                <option value="foreign-key">Foreign key</option>
                <option value="composition">Composition</option>
                <option value="inherit">Inherit</option>
                <option value="label">Label</option>
              </select>
            </label>
          </div>
          {draft.kind === "inherit" && <p className="rounded-lg bg-violet-50 px-3 py-2 text-xs text-violet-900">The source is the child and the target is the parent. SQL export copies every effective parent field into the child table.</p>}
          {draft.kind === "composition" && <p className="rounded-lg bg-slate-100 px-3 py-2 text-xs leading-5 text-slate-800"><strong data-i18n-skip={Boolean(draftSource)}>{draftSource?.title ?? "Source"}</strong> is the owner and <strong data-i18n-skip={Boolean(draftTarget)}>{draftTarget?.title ?? "Target"}</strong> is its child. The name becomes the owner field. Relational projection uses ON DELETE CASCADE; document and search projections embed the child under that field.</p>}
          {draft.kind === "foreign-key" && <label className="block"><span className="text-sm font-bold text-slate-700">ON DELETE</span><select className="select select-bordered mt-2 w-full" value={draft.onDelete ?? "no_action"} onChange={handleOnDeleteChange}><option value="no_action">NO ACTION</option><option value="restrict">RESTRICT</option><option value="cascade">CASCADE</option><option value="set_null">SET NULL</option></select>{draft.onDelete === "set_null" && !relationshipForeignKeyNullable(draft) && <span className="mt-1 block text-xs font-semibold text-red-700">SET NULL requires an optional referenced endpoint.</span>}</label>}
          {draft.kind === "composition" && <label className="block"><span className="text-sm font-bold text-slate-700">ON DELETE</span><input className="input input-bordered mt-2 w-full bg-slate-100 font-mono" value="CASCADE" readOnly aria-label="Composition deletion action" /></label>}
          {draft.kind !== "label" && <><div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
            <label className="block">
              <span className="block truncate text-sm font-bold text-slate-700"><span data-i18n-skip={Boolean(draftSource)}>{draftSource?.title ?? "Source"}</span>{draft.kind === "composition" ? " (owner)" : ""}</span>
              <select className="select select-bordered mt-2 w-full" value={draft.sourceMultiplicity} onChange={handleSourceMultiplicity}>
                {multiplicities.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
            <button type="button" className="btn btn-outline btn-square" onClick={handleDirection} aria-label="Reverse relationship reading direction" title="Reverse reading direction">
              <ArrowLeftRight size={17} />
            </button>
            <label className="block">
              <span className="block truncate text-sm font-bold text-slate-700"><span data-i18n-skip={Boolean(draftTarget)}>{draftTarget?.title ?? "Target"}</span>{draft.kind === "composition" ? " (child)" : ""}</span>
              <select className="select select-bordered mt-2 w-full" value={draft.targetMultiplicity} onChange={handleTargetMultiplicity}>
                {multiplicities.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
          </div>
          <fieldset>
            <legend className="text-sm font-bold text-slate-700">Arrow direction</legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button type="button" className={`btn btn-sm ${draft.direction === "source-to-target" ? "btn-primary" : "btn-outline"}`} onClick={handleSourceToTarget}>
                <span data-i18n-skip={Boolean(draftSource)}>{draftSource?.title ?? "Source"}</span> → <span data-i18n-skip={Boolean(draftTarget)}>{draftTarget?.title ?? "Target"}</span>
              </button>
              <button type="button" className={`btn btn-sm ${draft.direction === "target-to-source" ? "btn-primary" : "btn-outline"}`} onClick={handleTargetToSource}>
                <span data-i18n-skip={Boolean(draftTarget)}>{draftTarget?.title ?? "Target"}</span> → <span data-i18n-skip={Boolean(draftSource)}>{draftSource?.title ?? "Source"}</span>
              </button>
            </div>
          </fieldset></>}
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
            <Link2 size={13} className="mr-1 inline" />
            {draft.kind === "label" ? "A label relationship displays only its name; multiplicity and reading direction are not shown." : draft.kind === "composition" ? <>The filled diamond stays on <span data-i18n-skip={Boolean(draftSource)}>{draftSource?.title ?? "Source"}</span>, independently of the reading arrow. The field is named <strong data-i18n-skip={Boolean(draft.name.trim())}>{draft.name.trim() || "(name required)"}</strong>.</> : <>The arrow reads <span data-i18n-skip>{draft.direction === "source-to-target" ? `${draftSource?.title ?? "Source"} → ${draftTarget?.title ?? "Target"}` : `${draftTarget?.title ?? "Target"} → ${draftSource?.title ?? "Source"}`}</span>. This remains a relationship entity; SQL projection is deferred to export.</>}
          </p>
        </div>
        <footer className="flex items-center justify-between border-t border-slate-200 px-5 py-4">
          <button type="button" className="btn btn-ghost text-red-600 hover:bg-red-50" disabled={!canDelete} onClick={handleDelete}><Trash2 size={16} /> Delete</button>
          <div className="flex gap-2">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={isSaveDisabled}>Save relationship</button>
          </div>
        </footer>
      </form>
    </dialog>,
    document.body
  );
}
