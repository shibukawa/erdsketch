import { Info, X } from "lucide-react";
import { useCallback, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import type { DfdIntermediateKind, DfdNode, DfdProcessKind } from "../../features/modeling/types";
import { reconcilePhysicalProcesses } from "../../features/dfd/dfd";

export type DfdNodeDraft = Pick<DfdNode, "name" | "description"> & { processKind?: DfdProcessKind; intermediateKind?: DfdIntermediateKind; format?: string; physicalProcesses?: DfdNode["physicalProcesses"]; definitionId?: string };

const modeLabels = { process: "process", external: "external entity", intermediate: "intermediate data" } as const;

type DfdNodeDialogProps = {
  mode: "process" | "external" | "intermediate";
  existingExternalDefinitions?: Array<{ id: string; name: string }>;
  initial?: DfdNode;
  title?: string;
  connectionReason?: "process" | "data_entity";
  onSave: (draft: DfdNodeDraft) => void;
  onClose: () => void;
};

export function DfdNodeDialog({ mode, existingExternalDefinitions = [], initial, title, connectionReason, onSave, onClose }: DfdNodeDialogProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [processKind, setProcessKind] = useState<DfdProcessKind>(initial?.processKind ?? "batch");
  const [intermediateKind, setIntermediateKind] = useState<DfdIntermediateKind>(initial?.intermediateKind ?? "file");
  const [format, setFormat] = useState(initial?.format ?? (mode === "intermediate" ? "JSON" : ""));
  const [physicalText, setPhysicalText] = useState(initial?.physicalProcesses?.map((item) => item.name).join("\n") ?? "");
  const [definitionId, setDefinitionId] = useState("");
  const heading = useMemo(() => title ?? `Add ${modeLabels[mode]}`, [mode, title]);
  const handleNameChange = useCallback((event: ChangeEvent<HTMLInputElement>) => setName(event.target.value), []);
  const handleDescriptionChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => setDescription(event.target.value), []);
  const handleProcessKindChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => setProcessKind(event.target.value as DfdProcessKind), []);
  const handlePhysicalTextChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => setPhysicalText(event.target.value), []);
  const handleIntermediateKindChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => setIntermediateKind(event.target.value as DfdIntermediateKind), []);
  const handleFormatChange = useCallback((event: ChangeEvent<HTMLInputElement>) => setFormat(event.target.value), []);
  const handleExisting = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    setDefinitionId(event.target.value);
    const definition = existingExternalDefinitions.find((item) => item.id === event.target.value);
    if (definition) setName(definition.name);
  }, [existingExternalDefinitions]);
  const handleSubmit = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const physicalProcesses = reconcilePhysicalProcesses(initial?.physicalProcesses, physicalText.split("\n").map((item) => item.trim()).filter(Boolean));
    if (!name.trim()) return;
    onSave({ name: name.trim(), description: description.trim(), processKind, intermediateKind, format: format.trim(), physicalProcesses, definitionId: definitionId || initial?.definitionId });
  }, [definitionId, description, format, initial?.definitionId, intermediateKind, name, onSave, physicalText, processKind]);
  return <div className="modal modal-open" role="dialog" aria-modal="true" aria-labelledby="dfd-node-title"><form className="modal-box max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-lg overflow-x-hidden overflow-y-auto rounded-xl bg-white p-4 sm:p-6" onSubmit={handleSubmit}><header className="flex items-start justify-between gap-3"><h2 id="dfd-node-title" className="min-w-0 break-words text-xl font-bold leading-tight">{heading}</h2><button type="button" className="btn btn-ghost btn-sm btn-square shrink-0" onClick={onClose} aria-label="Close node dialog"><X size={18} /></button></header>
    <div className="mt-5 min-w-0 space-y-4">
    {mode === "external" && existingExternalDefinitions.length > 0 && <label className="form-control min-w-0"><span className="label-text mb-1 text-xs font-bold">Reuse external entity</span><select className="select select-bordered w-full min-w-0" value={definitionId} onChange={handleExisting}><option value="">Create new definition</option>{existingExternalDefinitions.map((item) => <option data-i18n-skip key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
    <label className="form-control min-w-0"><span className="label-text mb-1 text-xs font-bold">Name</span><input autoFocus className="input input-bordered w-full min-w-0" value={name} onChange={handleNameChange} /></label>
    {mode === "process" && <><label className="form-control min-w-0"><span className="label-text mb-1 text-xs font-bold">Process type</span><select className="select select-bordered w-full min-w-0" value={processKind} onChange={handleProcessKindChange}><option value="batch">Batch</option><option value="ui">Human-operated UI</option></select></label><label className="form-control min-w-0"><span className="label-text mb-1 text-xs font-bold">Physical processes · optional, one per line</span><textarea className="textarea textarea-bordered h-28 w-full min-w-0" value={physicalText} onChange={handlePhysicalTextChange} placeholder="Adding entries presents this as a logical process." /></label></>}
    {mode === "intermediate" && <><label className="form-control min-w-0"><span className="label-text mb-1 text-xs font-bold">Intermediate kind</span><select className="select select-bordered w-full min-w-0" value={intermediateKind} onChange={handleIntermediateKindChange}><option value="file">File / API payload / email</option><option value="queue">Queue / stream / event</option></select></label>{intermediateKind === "file" && <label className="form-control min-w-0"><span className="label-text mb-1 text-xs font-bold">Format</span><input className="input input-bordered w-full min-w-0" value={format} onChange={handleFormatChange} placeholder="JSON, CSV, PDF…" /></label>}</>}
    <label className="form-control min-w-0"><span className="label-text mb-1 text-xs font-bold">Description</span><textarea className="textarea textarea-bordered w-full min-w-0" value={description} onChange={handleDescriptionChange} /></label>
    </div>
    {connectionReason && <aside className="mt-4 flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950" role="note"><Info className="mt-0.5 shrink-0 text-amber-700" size={18} /><div className="min-w-0"><p className="font-bold">Why this dialog appeared</p><ul className="mt-1 list-disc space-y-1 pl-5 leading-relaxed">{connectionReason === "data_entity" ? <li>DFD data entity nodes (files, tables, and queues) cannot connect directly to each other.</li> : <><li>DFD process nodes (batch and UI) cannot connect directly to each other.</li><li>When multiple processes work together, represent them as physical processes within a node.</li></>}</ul></div></aside>}
    <div className="modal-action flex-wrap"><button type="button" className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={!name.trim()}>Save</button></div></form><button type="button" className="modal-backdrop" onClick={onClose} aria-label="Close node dialog" /></div>;
}
