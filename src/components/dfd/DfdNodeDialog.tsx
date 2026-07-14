import { X } from "lucide-react";
import { useCallback, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import type { DfdIntermediateKind, DfdNode, DfdProcessKind } from "../../features/modeling/types";
import { reconcilePhysicalProcesses } from "../../features/dfd/dfd";

export type DfdNodeDraft = Pick<DfdNode, "name" | "description"> & { processKind?: DfdProcessKind; intermediateKind?: DfdIntermediateKind; format?: string; physicalProcesses?: DfdNode["physicalProcesses"]; definitionId?: string };

type DfdNodeDialogProps = {
  mode: "process" | "external" | "intermediate";
  existingExternalDefinitions?: Array<{ id: string; name: string }>;
  initial?: DfdNode;
  title?: string;
  onSave: (draft: DfdNodeDraft) => void;
  onClose: () => void;
};

export function DfdNodeDialog({ mode, existingExternalDefinitions = [], initial, title, onSave, onClose }: DfdNodeDialogProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [processKind, setProcessKind] = useState<DfdProcessKind>(initial?.processKind ?? "batch");
  const [intermediateKind, setIntermediateKind] = useState<DfdIntermediateKind>(initial?.intermediateKind ?? "file");
  const [format, setFormat] = useState(initial?.format ?? (mode === "intermediate" ? "JSON" : ""));
  const [physicalText, setPhysicalText] = useState(initial?.physicalProcesses?.map((item) => item.name).join("\n") ?? "");
  const [definitionId, setDefinitionId] = useState("");
  const heading = useMemo(() => title ?? `Add ${mode.replace("-", " ")}`, [mode, title]);
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
  }, [definitionId, description, format, initial?.definitionId, intermediateKind, mode, name, onSave, physicalText, processKind]);
  return <div className="modal modal-open" role="dialog" aria-modal="true" aria-labelledby="dfd-node-title"><form className="modal-box max-w-lg rounded-xl bg-white" onSubmit={handleSubmit}><header className="flex items-center justify-between"><h2 id="dfd-node-title" className="text-xl font-bold">{heading}</h2><button type="button" className="btn btn-ghost btn-sm btn-square" onClick={onClose}><X size={18} /></button></header><div className="mt-5 space-y-4">
    {mode === "external" && existingExternalDefinitions.length > 0 && <label className="form-control"><span className="label-text mb-1 text-xs font-bold">Reuse external entity</span><select className="select select-bordered" value={definitionId} onChange={handleExisting}><option value="">Create new definition</option>{existingExternalDefinitions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
    <label className="form-control"><span className="label-text mb-1 text-xs font-bold">Name</span><input autoFocus className="input input-bordered" value={name} onChange={(event) => setName(event.target.value)} /></label>
    {mode === "process" && <><label className="form-control"><span className="label-text mb-1 text-xs font-bold">Process type</span><select className="select select-bordered" value={processKind} onChange={(event) => setProcessKind(event.target.value as DfdProcessKind)}><option value="batch">Batch</option><option value="ui">Human-operated UI</option></select></label><label className="form-control"><span className="label-text mb-1 text-xs font-bold">Physical processes · optional, one per line</span><textarea className="textarea textarea-bordered h-28" value={physicalText} onChange={(event) => setPhysicalText(event.target.value)} placeholder="Adding entries presents this as a logical process." /></label></>}
    {mode === "intermediate" && <><label className="form-control"><span className="label-text mb-1 text-xs font-bold">Intermediate kind</span><select className="select select-bordered" value={intermediateKind} onChange={(event) => setIntermediateKind(event.target.value as DfdIntermediateKind)}><option value="file">File / API payload / email</option><option value="queue">Queue / stream / event</option></select></label>{intermediateKind === "file" && <label className="form-control"><span className="label-text mb-1 text-xs font-bold">Format</span><input className="input input-bordered" value={format} onChange={(event) => setFormat(event.target.value)} placeholder="JSON, CSV, PDF…" /></label>}</>}
    <label className="form-control"><span className="label-text mb-1 text-xs font-bold">Description</span><textarea className="textarea textarea-bordered" value={description} onChange={(event) => setDescription(event.target.value)} /></label>
  </div><div className="modal-action"><button type="button" className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={!name.trim()}>Save</button></div></form><button className="modal-backdrop" onClick={onClose} aria-label="Close node dialog" /></div>;
}
