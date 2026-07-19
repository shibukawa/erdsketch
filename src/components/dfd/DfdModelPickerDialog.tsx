import { Plus, Search, X } from "lucide-react";
import { startTransition, useCallback, useMemo, useState, type ChangeEvent, type FormEvent, type MouseEvent } from "react";
import { dependencyLabels } from "../../features/modeling/constants";
import type { Dependency, EntityRole, ModelSeed } from "../../features/modeling/types";
import { getDisplayName } from "../../features/modeling/utils";

type DfdModelPickerDialogProps = {
  models: ModelSeed[];
  placedModelIds: Set<string>;
  onPlace: (modelId: string) => void;
  onCreate: (input: { title: string; role: EntityRole; dependency: Dependency; usageScope: "shared" | "dfd_only" }) => Promise<boolean>;
  onClose: () => void;
};

export function DfdModelPickerDialog({ models, placedModelIds, onPlace, onCreate, onClose }: DfdModelPickerDialogProps) {
  const [query, setQuery] = useState("");
  const [independentOnly, setIndependentOnly] = useState(true);
  const [title, setTitle] = useState("");
  const [role, setRole] = useState<EntityRole>("work");
  const [dependency, setDependency] = useState<Dependency>("independent");
  const [usageScope, setUsageScope] = useState<"shared" | "dfd_only">("shared");
  const [saving, setSaving] = useState(false);
  const visible = useMemo(() => models.filter((model) => !placedModelIds.has(model.id) && (!independentOnly || model.dependency === "independent") && (!query.trim() || `${getDisplayName(model.title, model.names, "business")} ${model.role}`.toLowerCase().includes(query.trim().toLowerCase()))), [independentOnly, models, placedModelIds, query]);
  const handleQuery = useCallback((event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value), []);
  const handleIndependent = useCallback((event: ChangeEvent<HTMLInputElement>) => setIndependentOnly(event.target.checked), []);
  const handlePlace = useCallback((event: MouseEvent<HTMLButtonElement>) => onPlace(event.currentTarget.dataset.modelId!), [onPlace]);
  const handleCreate = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    if (await onCreate({ title: title.trim(), role, dependency, usageScope })) startTransition(() => setTitle(""));
    setSaving(false);
  }, [dependency, onCreate, role, title, usageScope]);

  return <div className="modal modal-open" role="dialog" aria-modal="true" aria-labelledby="dfd-model-picker-title"><div className="modal-box h-[78vh] max-w-5xl rounded-xl bg-white p-0">
    <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4"><div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Project model catalog</p><h2 id="dfd-model-picker-title" className="text-xl font-bold">Select model for DFD</h2></div><button type="button" className="btn btn-ghost btn-sm btn-square" onClick={onClose}><X size={18} /></button></header>
    <div className="grid h-[calc(78vh-73px)] md:grid-cols-[1fr_320px]">
      <section className="overflow-auto border-r border-slate-200 p-5"><div className="flex gap-3"><label className="input input-bordered input-sm flex flex-1 items-center gap-2"><Search size={15} /><input className="grow" placeholder="Search models" value={query} onChange={handleQuery} /></label><label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold"><input type="checkbox" className="checkbox checkbox-sm" checked={independentOnly} onChange={handleIndependent} />Parent tables only</label></div>
        <div className="mt-4 space-y-2">{visible.map((model) => <div key={model.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3"><div><strong data-i18n-skip>{getDisplayName(model.title, model.names, "business")}</strong><div className="mt-1 flex gap-1"><span className="badge badge-outline badge-sm">{model.role}</span><span className="badge badge-ghost badge-sm">{dependencyLabels[model.dependency]}</span>{model.usageScope === "dfd_only" && <span className="badge badge-warning badge-sm">DFD only</span>}</div></div><button type="button" data-model-id={model.id} className="btn btn-primary btn-sm" onClick={handlePlace}>Place</button></div>)}</div>
        {visible.length === 0 && <p className="py-12 text-center text-sm text-slate-500">No unplaced models match these filters.</p>}
      </section>
      <form className="space-y-5 p-5" onSubmit={handleCreate}><div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Create from DFD</p><h3 className="mt-1 font-bold">New project model</h3></div><label className="form-control"><span className="label-text mb-1 text-xs font-bold">Name</span><input className="input input-bordered" value={title} onChange={(event) => setTitle(event.target.value)} /></label><label className="form-control"><span className="label-text mb-1 text-xs font-bold">Role</span><select className="select select-bordered" value={role} onChange={(event) => setRole(event.target.value as EntityRole)}>{["master", "transaction", "summary", "history", "work"].map((value) => <option key={value}>{value}</option>)}</select></label><label className="form-control"><span className="label-text mb-1 text-xs font-bold">Table type</span><select className="select select-bordered" value={dependency} onChange={(event) => setDependency(event.target.value as Dependency)}><option value="independent">Parent table</option><option value="dependent">Dependent table</option></select></label><label className="form-control"><span className="label-text mb-1 text-xs font-bold">Usage</span><select className="select select-bordered" value={usageScope} onChange={(event) => setUsageScope(event.target.value as "shared" | "dfd_only")}><option value="shared">ERD and DFD</option><option value="dfd_only">DFD only</option></select></label><button className="btn btn-primary w-full gap-2" disabled={saving || !title.trim()}><Plus size={16} />Create and place</button></form>
    </div>
  </div><button className="modal-backdrop" onClick={onClose} aria-label="Close model picker" /></div>;
}
