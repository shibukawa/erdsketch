import { Trash2, Ungroup } from "lucide-react";
import { useCallback, type ChangeEvent, type MouseEvent } from "react";
import { roleMeta, roleOptions } from "../../features/modeling/constants";
import type { DfdCrudAssignment, DfdFlow, DfdGroup, DfdIntermediateKind, DfdNode, DfdProcessKind, EntityRole, ModelSeed } from "../../features/modeling/types";
import { getModelStageLabel } from "../../features/modeling/utils";
import { reconcilePhysicalProcesses } from "../../features/dfd/dfd";
import { CommittedTextInput } from "../forms/CommittedTextInput";
import { CommittedTextarea } from "../forms/CommittedTextarea";
import { DfdCrudEditor } from "./DfdCrudEditor";

type Props = {
  node?: DfdNode;
  group?: DfdGroup;
  flow?: DfdFlow;
  model?: ModelSeed;
  nodes: DfdNode[];
  groups: DfdGroup[];
  models: ModelSeed[];
  externalDefinitions: Array<{ id: string; name: string }>;
  onUpdateNode: (patch: Partial<DfdNode>) => void;
  onUpdateFlow: (patch: Partial<DfdFlow>) => void;
  onUpdateModel: (patch: Partial<ModelSeed>) => void;
  onUngroup: () => void;
  onDelete: () => void;
};

export function DfdSelectionInspector({ node, group, flow, model, nodes, groups, models, externalDefinitions, onUpdateNode, onUpdateFlow, onUpdateModel, onUngroup, onDelete }: Props) {
  const handleProcessKind = useCallback((event: ChangeEvent<HTMLSelectElement>) => onUpdateNode({ processKind: event.target.value as DfdProcessKind }), [onUpdateNode]);
  const handlePhysicalProcesses = useCallback((value: string) => onUpdateNode({ physicalProcesses: reconcilePhysicalProcesses(node?.physicalProcesses, value.split("\n").map((item) => item.trim()).filter(Boolean)) }), [node?.physicalProcesses, onUpdateNode]);
  const handleIntermediateKind = useCallback((event: ChangeEvent<HTMLSelectElement>) => onUpdateNode({ intermediateKind: event.target.value as DfdIntermediateKind }), [onUpdateNode]);
  const handleFormat = useCallback((value: string) => onUpdateNode({ format: value }), [onUpdateNode]);
  const handleExternalDefinition = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    const definition = externalDefinitions.find((item) => item.id === event.target.value);
    if (definition) onUpdateNode({ definitionId: definition.id, name: definition.name });
  }, [externalDefinitions, onUpdateNode]);
  const handleFlowLabel = useCallback((value: string) => onUpdateFlow({ label: value }), [onUpdateFlow]);
  const handleProtocol = useCallback((value: string) => onUpdateFlow({ protocol: value }), [onUpdateFlow]);
  const handleBidirectional = useCallback((event: ChangeEvent<HTMLInputElement>) => onUpdateFlow({ bidirectional: event.target.checked }), [onUpdateFlow]);
  const handleCrudAssignments = useCallback((crudAssignments: DfdCrudAssignment[]) => onUpdateFlow({ crudAssignments }), [onUpdateFlow]);
  const handleRole = useCallback((event: MouseEvent<HTMLButtonElement>) => onUpdateModel({ role: event.currentTarget.dataset.role as EntityRole }), [onUpdateModel]);

  const title = node ? model?.title ?? node.name : group ? `${group.kind.replace("_", " ")} group` : flow?.label || "Data flow";
  return <section className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Selected</p>
    <h2 data-i18n-skip={Boolean(node || flow?.label)} className="mt-1 truncate font-bold">{title}</h2>
    {node && !model && <div className="mt-4 space-y-3">
      {node.kind === "external" && externalDefinitions.length > 1 && <label className="block"><span className="mb-1 block text-xs font-bold text-slate-600">Reuse external entity</span><select className="select select-bordered select-sm w-full" value={node.definitionId} onChange={handleExternalDefinition}>{externalDefinitions.map((item) => <option data-i18n-skip key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
      {node.kind === "process" && <><label className="block"><span className="mb-1 block text-xs font-bold text-slate-600">Process type</span><select className="select select-bordered select-sm w-full" value={node.processKind ?? "batch"} onChange={handleProcessKind}><option value="batch">Batch</option><option value="ui">Human-operated UI</option></select></label><label className="block"><span className="mb-1 block text-xs font-bold text-slate-600">Physical processes · one per line</span><CommittedTextarea className="textarea textarea-bordered h-24 w-full text-sm" value={node.physicalProcesses?.map((item) => item.name).join("\n") ?? ""} onCommit={handlePhysicalProcesses} /></label></>}
      {node.kind === "intermediate" && <><label className="block"><span className="mb-1 block text-xs font-bold text-slate-600">Intermediate kind</span><select className="select select-bordered select-sm w-full" value={node.intermediateKind ?? "file"} onChange={handleIntermediateKind}><option value="file">File / API payload / email</option><option value="queue">Queue / stream / event</option></select></label>{node.intermediateKind !== "queue" && <label className="block"><span className="mb-1 block text-xs font-bold text-slate-600">Format</span><CommittedTextInput className="input input-bordered input-sm w-full" value={node.format ?? ""} onCommit={handleFormat} placeholder="JSON, CSV, PDF…" /></label>}</>}
    </div>}
    {model && <div className="mt-4 space-y-4"><div className="rounded-lg border border-slate-200 bg-white px-3 py-2"><p className="text-xs font-bold text-slate-500">Automatic maturity</p><p className="mt-1 text-sm font-bold text-slate-700">{getModelStageLabel(model.maturedLevel)}</p></div><div><p className="text-xs font-bold text-slate-600">Role</p><div className="mt-2 flex flex-wrap gap-1.5">{roleOptions.map((role) => <button key={role} type="button" data-role={role} className={`rounded-md border px-2 py-1 text-xs font-semibold ${model.role === role ? roleMeta[role].chip : "border-slate-200 bg-white text-slate-700"}`} onClick={handleRole}>{role}</button>)}</div></div></div>}
    {flow && <div className="mt-4 space-y-3"><label className="block"><span className="mb-1 block text-xs font-bold text-slate-600">Label</span><CommittedTextInput className="input input-bordered input-sm w-full" value={flow.label ?? ""} onCommit={handleFlowLabel} placeholder="Timer, push, event driven…" /></label><label className="block"><span className="mb-1 block text-xs font-bold text-slate-600">Protocol</span><CommittedTextInput className="input input-bordered input-sm w-full" value={flow.protocol ?? ""} onCommit={handleProtocol} placeholder="HTTPS, S3, Kafka…" /></label><DfdCrudEditor flow={flow} nodes={nodes} groups={groups} models={models} onChange={handleCrudAssignments} /><label className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2"><span className="text-xs font-bold text-slate-600">Bidirectional</span><input type="checkbox" className="toggle toggle-primary toggle-sm" checked={Boolean(flow.bidirectional)} onChange={handleBidirectional} /></label></div>}
    <div className="mt-4 grid gap-2">{group && <button type="button" className="btn btn-sm btn-outline gap-2" onClick={onUngroup}><Ungroup size={15} />Ungroup</button>}<button type="button" className="btn btn-sm btn-error btn-outline gap-2" onClick={onDelete}><Trash2 size={14} />Delete</button></div>
  </section>;
}
