import { ArrowDown, ArrowUp, GripVertical, Plus, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent, type MouseEvent, type SyntheticEvent } from "react";
import { createPortal } from "react-dom";
import type { DataDomain, IndexDefinition, IndexKey, ModelField, Relationship, RelationshipReference } from "../../features/modeling/types";
import { indexKeyCandidateID, physicalColumnCandidates } from "../../features/modeling/physicalDesign";

type IndexDefinitionDialogProps = {
  fields: ModelField[];
  domains: DataDomain[];
  relationshipReferences: Array<{ relationship: Relationship; reference: RelationshipReference }>;
  initial: IndexDefinition[];
  canEdit: boolean;
  onSave: (indexes: IndexDefinition[]) => void;
  onClose: () => void;
};

export function IndexDefinitionDialog({ fields, domains, relationshipReferences, initial, canEdit, onSave, onClose }: IndexDefinitionDialogProps) {
  const [drafts, setDrafts] = useState<IndexDefinition[]>(() => structuredClone(initial));
  const [errors, setErrors] = useState<string[]>([]);
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const candidates = useMemo(() => physicalColumnCandidates(fields, domains, relationshipReferences), [domains, fields, relationshipReferences]);
  const candidateByID = useMemo(() => new Map(candidates.map((candidate) => [candidate.id, candidate])), [candidates]);

  useEffect(() => { dialogRef.current?.showModal(); }, []);

  const handleAddIndex = useCallback(() => {
    const suffix = drafts.length + 1;
    setDrafts((current) => [...current, { id: crypto.randomUUID(), name: `idx_${suffix}`, unique: false, keys: [] }]);
  }, [drafts.length]);
  const handleNameChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const id = event.currentTarget.dataset.indexId;
    setDrafts((current) => current.map((index) => index.id === id ? { ...index, name: event.target.value } : index));
  }, []);
  const handleUniqueChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const id = event.currentTarget.dataset.indexId;
    setDrafts((current) => current.map((index) => index.id === id ? { ...index, unique: event.target.checked } : index));
  }, []);
  const handleDeleteIndex = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    const id = event.currentTarget.dataset.indexId;
    setDrafts((current) => current.filter((index) => index.id !== id));
  }, []);
  const handleCandidateDragStart = useCallback((event: DragEvent<HTMLButtonElement>) => {
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData("application/x-erdsketch-index-candidate", event.currentTarget.dataset.candidateId ?? "");
  }, []);
  const handleGroupDragOver = useCallback((event: DragEvent<HTMLElement>) => {
    event.preventDefault();
  }, []);
  const handleGroupDrop = useCallback((event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    const indexId = event.currentTarget.dataset.indexId;
    const candidate = candidateByID.get(event.dataTransfer.getData("application/x-erdsketch-index-candidate"));
    if (!indexId || !candidate) return;
    setDrafts((current) => current.map((index) => {
      if (index.id !== indexId || index.keys.some((key) => indexKeyCandidateID(key) === candidate.id)) return index;
      return { ...index, keys: [...index.keys, { source: candidate.source, sourceId: candidate.sourceId, componentId: candidate.componentId, direction: "ascending" }] };
    }));
  }, [candidateByID]);
  const handleAddColumn = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    const indexId = event.currentTarget.dataset.indexId;
    const candidate = candidateByID.get(event.target.value);
    event.target.value = "";
    if (!indexId || !candidate) return;
    setDrafts((current) => current.map((index) => {
      if (index.id !== indexId || index.keys.some((key) => indexKeyCandidateID(key) === candidate.id)) return index;
      return { ...index, keys: [...index.keys, { source: candidate.source, sourceId: candidate.sourceId, componentId: candidate.componentId, direction: "ascending" }] };
    }));
  }, [candidateByID]);
  const handleMoveKey = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    const indexId = event.currentTarget.dataset.indexId;
    const position = Number(event.currentTarget.dataset.position);
    const offset = Number(event.currentTarget.dataset.offset);
    setDrafts((current) => current.map((index) => {
      if (index.id !== indexId) return index;
      const target = position + offset;
      if (target < 0 || target >= index.keys.length) return index;
      const keys = [...index.keys];
      [keys[position], keys[target]] = [keys[target], keys[position]];
      return { ...index, keys };
    }));
  }, []);
  const handleDirectionChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    const indexId = event.currentTarget.dataset.indexId;
    const position = Number(event.currentTarget.dataset.position);
    setDrafts((current) => current.map((index) => index.id !== indexId ? index : { ...index, keys: index.keys.map((key, keyIndex) => keyIndex === position ? { ...key, direction: event.target.value as IndexKey["direction"] } : key) }));
  }, []);
  const handleRemoveKey = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    const indexId = event.currentTarget.dataset.indexId;
    const position = Number(event.currentTarget.dataset.position);
    setDrafts((current) => current.map((index) => index.id !== indexId ? index : { ...index, keys: index.keys.filter((_, keyIndex) => keyIndex !== position) }));
  }, []);
  const handleSubmit = useCallback((event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: string[] = [];
    const names = new Set<string>();
    for (const index of drafts) {
      const name = index.name.trim().toLowerCase();
      if (!name) nextErrors.push("Every index needs a name.");
      else if (names.has(name)) nextErrors.push(`Duplicate index name: ${index.name}.`);
      names.add(name);
      if (index.keys.length === 0) nextErrors.push(`${index.name || "Index"} needs at least one column.`);
    }
    setErrors(nextErrors);
    if (nextErrors.length === 0) onSave(drafts.map((index) => ({ ...index, name: index.name.trim() })));
  }, [drafts, onSave]);
  const handleCancel = useCallback((event: SyntheticEvent<HTMLDialogElement>) => { event.preventDefault(); onClose(); }, [onClose]);

  return createPortal(<dialog ref={dialogRef} className="field-list-dialog m-auto h-[min(88vh,820px)] w-[min(94vw,980px)] rounded-xl border border-slate-200 bg-white p-0 text-slate-950 shadow-2xl" onCancel={handleCancel}>
    <form className="flex h-full min-h-0 flex-col" onSubmit={handleSubmit}>
      <header className="flex items-start justify-between border-b border-slate-200 px-5 py-4"><div><p className="text-xs font-bold uppercase tracking-wide text-blue-600">Physical design</p><h2 className="mt-1 text-xl font-bold">Indexes</h2><p className="mt-1 text-xs text-slate-500">Drag columns into groups. Order inside each group defines composite-index order.</p></div><button type="button" className="btn btn-ghost btn-sm btn-square" onClick={onClose} aria-label="Close index editor"><X size={18}/></button></header>
      <div className="grid min-h-0 flex-1 grid-cols-[240px_1fr]">
        <aside className="overflow-y-auto border-r border-slate-200 bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Available columns</p><div className="mt-3 space-y-2">{candidates.map((candidate) => <button key={candidate.id} type="button" draggable={canEdit} data-candidate-id={candidate.id} onDragStart={handleCandidateDragStart} className="flex w-full cursor-grab items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left font-mono text-xs font-semibold shadow-sm"><GripVertical size={13} className="text-slate-400"/><span className="min-w-0 truncate">{candidate.label}</span></button>)}</div></aside>
        <section className="min-h-0 overflow-y-auto p-4"><div className="mb-3 flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Index groups</p><button type="button" className="btn btn-primary btn-sm" disabled={!canEdit} onClick={handleAddIndex}><Plus size={15}/>Add index</button></div>{drafts.length === 0 ? <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center text-sm text-slate-500">No indexes. Add a group, then drag columns into it.</div> : <div className="space-y-4">{drafts.map((index) => <article key={index.id} data-index-id={index.id} onDragOver={handleGroupDragOver} onDrop={handleGroupDrop} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center gap-3"><input data-index-id={index.id} className="input input-bordered input-sm min-w-0 flex-1 font-mono" value={index.name} disabled={!canEdit} onChange={handleNameChange}/><label className="flex items-center gap-2 text-xs font-bold"><input data-index-id={index.id} type="checkbox" className="checkbox checkbox-sm" checked={index.unique} disabled={!canEdit} onChange={handleUniqueChange}/>UNIQUE</label><button type="button" data-index-id={index.id} className="btn btn-ghost btn-sm btn-square text-red-600" disabled={!canEdit} onClick={handleDeleteIndex}><Trash2 size={15}/></button></div><div className="mt-3 flex items-center gap-2"><select data-index-id={index.id} className="select select-bordered select-sm min-w-0 flex-1" defaultValue="" disabled={!canEdit} onChange={handleAddColumn}><option value="" disabled>Add column…</option>{candidates.filter((candidate) => !index.keys.some((key) => indexKeyCandidateID(key) === candidate.id)).map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.label}</option>)}</select><span className="text-xs text-slate-400">or drag from the left</span></div><ol className="mt-3 space-y-1">{index.keys.map((key, position) => { const candidate = candidateByID.get(indexKeyCandidateID(key)); return <li key={`${index.id}:${indexKeyCandidateID(key)}`} className="grid grid-cols-[28px_1fr_110px_32px_32px_32px] items-center gap-1 rounded-lg bg-slate-50 px-2 py-1.5"><span className="text-center text-xs font-bold text-slate-400">{position + 1}</span><span className="truncate font-mono text-xs font-semibold">{candidate?.label ?? "Missing column"}</span><select data-index-id={index.id} data-position={position} className="select select-bordered select-xs" value={key.direction} disabled={!canEdit} onChange={handleDirectionChange}><option value="ascending">ASC</option><option value="descending">DESC</option></select><button type="button" data-index-id={index.id} data-position={position} data-offset={-1} className="btn btn-ghost btn-xs btn-square" disabled={!canEdit || position === 0} onClick={handleMoveKey}><ArrowUp size={13}/></button><button type="button" data-index-id={index.id} data-position={position} data-offset={1} className="btn btn-ghost btn-xs btn-square" disabled={!canEdit || position === index.keys.length - 1} onClick={handleMoveKey}><ArrowDown size={13}/></button><button type="button" data-index-id={index.id} data-position={position} className="btn btn-ghost btn-xs btn-square text-red-600" disabled={!canEdit} onClick={handleRemoveKey}><X size={13}/></button></li>;})}</ol><div className="mt-3 rounded-lg border border-dashed border-slate-300 px-3 py-3 text-center text-xs text-slate-400">Drop columns here</div></article>)}</div>}{errors.length > 0 && <ul className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-xs font-semibold text-red-800">{errors.map((error) => <li key={error}>{error}</li>)}</ul>}</section>
      </div>
      <footer className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4"><button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button><button type="submit" className="btn btn-primary" disabled={!canEdit}>Save indexes</button></footer>
    </form>
  </dialog>, document.body);
}
