import { Cable, Group, Search, TriangleAlert } from "lucide-react";
import type { DfdFlow, DfdGroup, DfdNode, ModelSeed } from "../../features/modeling/types";
import type { DfdWarning } from "../../features/dfd/dfd";
import { DfdQuickCreate, type DfdQuickCreateKind } from "./DfdQuickCreate";
import { DfdSelectionInspector } from "./DfdSelectionInspector";

type Props = {
  selectedNode?: DfdNode; selectedGroup?: DfdGroup; selectedFlow?: DfdFlow; selectedModel?: ModelSeed; warnings: DfdWarning[];
  nodes: DfdNode[];
  groups: DfdGroup[];
  models: ModelSeed[];
  externalDefinitions: Array<{ id: string; name: string }>;
  onQuickCreate: (kind: DfdQuickCreateKind, name: string) => Promise<boolean> | boolean;
  onOpenModelPicker: () => void;
  onUpdateNode: (patch: Partial<DfdNode>) => void;
  onUpdateFlow: (patch: Partial<DfdFlow>) => void;
  onUpdateModel: (patch: Partial<ModelSeed>) => void;
  onUngroup: () => void; onDeleteSelected: () => void; onFocusWarning: (warning: DfdWarning) => void;
};

export function DfdSidebar({ selectedNode, selectedGroup, selectedFlow, selectedModel, warnings, nodes, groups, models, externalDefinitions, onQuickCreate, onOpenModelPicker, onUpdateNode, onUpdateFlow, onUpdateModel, onUngroup, onDeleteSelected, onFocusWarning }: Props) {
  return <aside className="z-20 flex w-[330px] shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-white px-5 py-5 shadow-sm"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-700 text-white"><Cable size={20} /></div><div><p className="text-sm font-semibold text-slate-500">ERDSketch</p><h1 className="text-xl font-bold">Data Flow</h1></div></div>
    <section data-tour="dfd-quick-create" className="mt-6"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Quick create</p><DfdQuickCreate onCreate={onQuickCreate} /></section>
    <section className="mt-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Quick create</p><DfdQuickCreate onCreate={onQuickCreate} /></section>
    {(selectedNode || selectedGroup || selectedFlow) && <DfdSelectionInspector node={selectedNode} group={selectedGroup} flow={selectedFlow} model={selectedModel} nodes={nodes} groups={groups} models={models} externalDefinitions={externalDefinitions} onUpdateNode={onUpdateNode} onUpdateFlow={onUpdateFlow} onUpdateModel={onUpdateModel} onUngroup={onUngroup} onDelete={onDeleteSelected} />}
    <section className="mt-6"><div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Validation</p><span className={`badge badge-sm ${warnings.length ? "badge-warning" : "badge-success"}`}>{warnings.length}</span></div><div className="mt-2 space-y-2">{warnings.slice(0, 8).map((warning) => <button key={warning.id} type="button" className="flex w-full items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-left text-xs text-amber-950" onClick={() => onFocusWarning(warning)}><TriangleAlert size={14} className="mt-0.5 shrink-0" />{warning.message}</button>)}{warnings.length === 0 && <p className="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800">No DFD warnings.</p>}</div></section>
    <div className="mt-auto pt-6"><button data-tour="dfd-models" className="btn btn-outline w-full justify-start gap-2" onClick={onOpenModelPicker}><Search size={16} />Search project models</button><p className="mt-3 flex items-center gap-2 text-[11px] text-slate-500"><Group size={13} />Overlap same-class nodes to group them.</p></div>
  </aside>;
}
