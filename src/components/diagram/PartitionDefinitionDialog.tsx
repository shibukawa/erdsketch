import { ArrowDown, ArrowUp, Plus, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type MouseEvent, type SyntheticEvent } from "react";
import { createPortal } from "react-dom";
import type { DataDomain, ModelField, PartitionKey, RangePartitionScheme } from "../../features/modeling/types";
import { defaultRangePartition, formatPartitionBound, parsePartitionBound, physicalColumnCandidates, validateRangePartition } from "../../features/modeling/physicalDesign";

type PartitionDefinitionDialogProps = {
  fields: ModelField[];
  domains: DataDomain[];
  initial?: RangePartitionScheme;
  canEdit: boolean;
  onSave: (partitioning: RangePartitionScheme | undefined) => void;
  onClose: () => void;
};

function partitionKeyID(key: PartitionKey) {
  return `field:${key.fieldId}:${key.componentId ?? "scalar"}`;
}

export function PartitionDefinitionDialog({ fields, domains, initial, canEdit, onSave, onClose }: PartitionDefinitionDialogProps) {
  const candidates = useMemo(() => physicalColumnCandidates(fields, domains).filter((candidate) => candidate.source === "field"), [domains, fields]);
  const candidateByID = useMemo(() => new Map(candidates.map((candidate) => [candidate.id, candidate])), [candidates]);
  const [draft, setDraft] = useState<RangePartitionScheme>(() => structuredClone(initial ?? defaultRangePartition(candidates)));
  const [validation, setValidation] = useState(() => validateRangePartition(draft));
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  useEffect(() => { dialogRef.current?.showModal(); }, []);
  useEffect(() => { setValidation(validateRangePartition(draft)); }, [draft]);

  const handleAddKey = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    const candidate = candidateByID.get(event.currentTarget.dataset.candidateId ?? "");
    if (!candidate || draft.keys.some((key) => partitionKeyID(key) === candidate.id)) return;
    setDraft((current) => {
      const keys = [...current.keys, { fieldId: candidate.sourceId, componentId: candidate.componentId }];
      const ranges = current.ranges.map((range) => ({ ...range, from: [...range.from, { kind: "literal" as const, value: "" }], to: [...range.to, { kind: "literal" as const, value: "" }] }));
      return { ...current, keys, ranges };
    });
  }, [candidateByID, draft.keys]);
  const handleRemoveKey = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    const position = Number(event.currentTarget.dataset.position);
    setDraft((current) => ({ ...current, keys: current.keys.filter((_, index) => index !== position), ranges: current.ranges.map((range) => ({ ...range, from: range.from.filter((_, index) => index !== position), to: range.to.filter((_, index) => index !== position) })) }));
  }, []);
  const handleMoveKey = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    const position = Number(event.currentTarget.dataset.position);
    const offset = Number(event.currentTarget.dataset.offset);
    setDraft((current) => {
      const target = position + offset;
      if (target < 0 || target >= current.keys.length) return current;
      const keys = [...current.keys];
      [keys[position], keys[target]] = [keys[target], keys[position]];
      const ranges = current.ranges.map((range) => {
        const from = [...range.from]; const to = [...range.to];
        [from[position], from[target]] = [from[target], from[position]];
        [to[position], to[target]] = [to[target], to[position]];
        return { ...range, from, to };
      });
      return { ...current, keys, ranges };
    });
  }, []);
  const handleAddRange = useCallback(() => {
    setDraft((current) => ({ ...current, ranges: [...current.ranges, { id: crypto.randomUUID(), name: `p${current.ranges.length + 1}`, from: current.keys.map(() => ({ kind: "literal" as const, value: "" })), to: current.keys.map(() => ({ kind: "literal" as const, value: "" })) }] }));
  }, []);
  const handleRangeNameChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const rangeId = event.currentTarget.dataset.rangeId;
    setDraft((current) => ({ ...current, ranges: current.ranges.map((range) => range.id === rangeId ? { ...range, name: event.target.value } : range) }));
  }, []);
  const handleBoundChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const rangeId = event.currentTarget.dataset.rangeId;
    const side = event.currentTarget.dataset.side as "from" | "to";
    const position = Number(event.currentTarget.dataset.position);
    const bound = parsePartitionBound(event.target.value);
    setDraft((current) => ({ ...current, ranges: current.ranges.map((range) => {
      if (range.id !== rangeId) return range;
      const values = [...range[side]];
      values[position] = bound;
      return { ...range, [side]: values };
    }) }));
  }, []);
  const handleDeleteRange = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    const rangeId = event.currentTarget.dataset.rangeId;
    setDraft((current) => ({ ...current, ranges: current.ranges.filter((range) => range.id !== rangeId) }));
  }, []);
  const handleSubmit = useCallback((event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = validateRangePartition(draft);
    setValidation(result);
    if (result.errors.length === 0) onSave(draft);
  }, [draft, onSave]);
  const handleRemovePartitioning = useCallback(() => { onSave(undefined); }, [onSave]);
  const handleCancel = useCallback((event: SyntheticEvent<HTMLDialogElement>) => { event.preventDefault(); onClose(); }, [onClose]);

  const available = candidates.filter((candidate) => !draft.keys.some((key) => partitionKeyID(key) === candidate.id));
  return createPortal(<dialog ref={dialogRef} className="field-list-dialog m-auto h-[min(90vh,860px)] w-[min(96vw,1180px)] rounded-xl border border-slate-200 bg-white p-0 text-slate-950 shadow-2xl" onCancel={handleCancel}>
    <form className="flex h-full min-h-0 flex-col" onSubmit={handleSubmit}>
      <header className="flex items-start justify-between border-b border-slate-200 px-5 py-4"><div><p className="text-xs font-bold uppercase tracking-wide text-cyan-700">Physical design</p><h2 className="mt-1 text-xl font-bold">Range partitioning</h2><p className="mt-1 text-xs text-slate-500">Lower bounds are inclusive; upper bounds are exclusive.</p></div><button type="button" className="btn btn-ghost btn-sm btn-square" onClick={onClose} aria-label="Close partition editor"><X size={18}/></button></header>
      <div className="min-h-0 flex-1 overflow-auto p-5">
        <section><div className="flex items-center justify-between"><h3 className="text-sm font-bold">Partition keys</h3><span className="text-xs text-slate-500">Order is significant</span></div><div className="mt-2 flex flex-wrap gap-2">{draft.keys.map((key, position) => <div key={partitionKeyID(key)} className="flex items-center gap-1 rounded-lg border border-cyan-200 bg-cyan-50 px-2 py-1"><span className="font-mono text-xs font-bold text-cyan-950">{position + 1}. {candidateByID.get(partitionKeyID(key))?.label ?? "Missing field"}</span><button type="button" data-position={position} data-offset={-1} className="btn btn-ghost btn-xs btn-square" disabled={!canEdit || position === 0} onClick={handleMoveKey}><ArrowUp size={12}/></button><button type="button" data-position={position} data-offset={1} className="btn btn-ghost btn-xs btn-square" disabled={!canEdit || position === draft.keys.length - 1} onClick={handleMoveKey}><ArrowDown size={12}/></button><button type="button" data-position={position} className="btn btn-ghost btn-xs btn-square text-red-600" disabled={!canEdit} onClick={handleRemoveKey}><X size={12}/></button></div>)}</div><div className="mt-3 flex flex-wrap gap-2">{available.map((candidate) => <button type="button" key={candidate.id} data-candidate-id={candidate.id} className={`btn btn-xs ${candidate.partitionHint ? "btn-info" : "btn-outline"}`} disabled={!canEdit} onClick={handleAddKey}><Plus size={12}/>{candidate.label}{candidate.partitionHint ? " · hint" : ""}</button>)}</div></section>
        <section className="mt-6"><div className="flex items-center justify-between"><h3 className="text-sm font-bold">Ranges</h3><button type="button" className="btn btn-primary btn-sm" disabled={!canEdit || draft.keys.length === 0} onClick={handleAddRange}><Plus size={14}/>Add range</button></div>{draft.ranges.length === 0 ? <div className="mt-3 rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">Add named ranges after selecting partition keys.</div> : <div className="mt-3 space-y-3">{draft.ranges.map((range) => <article key={range.id} className="rounded-xl border border-slate-200 p-3"><div className="flex items-center gap-2"><input data-range-id={range.id} className="input input-bordered input-sm w-48 font-mono" value={range.name} disabled={!canEdit} onChange={handleRangeNameChange}/><span className="text-xs text-slate-500">FROM inclusive → TO exclusive</span><button type="button" data-range-id={range.id} className="btn btn-ghost btn-sm btn-square ml-auto text-red-600" disabled={!canEdit} onClick={handleDeleteRange}><Trash2 size={14}/></button></div><div className="mt-3 grid gap-2" style={{ gridTemplateColumns: `110px repeat(${Math.max(1, draft.keys.length)}, minmax(120px, 1fr))` }}><span/><>{draft.keys.map((key) => <span key={partitionKeyID(key)} className="truncate text-center font-mono text-[10px] font-bold text-slate-500">{candidateByID.get(partitionKeyID(key))?.label}</span>)}</><span className="text-xs font-bold text-slate-600">FROM</span>{range.from.map((bound, position) => <input key={`from:${position}`} data-range-id={range.id} data-side="from" data-position={position} className="input input-bordered input-sm font-mono" value={formatPartitionBound(bound)} disabled={!canEdit} placeholder="MINVALUE" onChange={handleBoundChange}/>)}<span className="text-xs font-bold text-slate-600">TO</span>{range.to.map((bound, position) => <input key={`to:${position}`} data-range-id={range.id} data-side="to" data-position={position} className="input input-bordered input-sm font-mono" value={formatPartitionBound(bound)} disabled={!canEdit} placeholder="MAXVALUE" onChange={handleBoundChange}/>)}</div></article>)}</div>}</section>
        {(validation.errors.length > 0 || validation.warnings.length > 0) && <div className="mt-5 grid gap-3 md:grid-cols-2">{validation.errors.length > 0 && <ul className="rounded-lg bg-red-50 px-4 py-3 text-xs font-semibold text-red-800">{validation.errors.map((error) => <li key={error}>{error}</li>)}</ul>}{validation.warnings.length > 0 && <ul className="rounded-lg bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-900">{validation.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>}</div>}
      </div>
      <footer className="flex items-center justify-between border-t border-slate-200 px-5 py-4"><button type="button" className="btn btn-ghost text-red-600" disabled={!canEdit || !initial} onClick={handleRemovePartitioning}>Remove partitioning</button><div className="flex gap-2"><button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button><button type="submit" className="btn btn-primary" disabled={!canEdit}>Save partitioning</button></div></footer>
    </form>
  </dialog>, document.body);
}
