import { Cable, Check, Database, Pencil, Plus, X } from "lucide-react";
import { startTransition, useCallback, useState, type ChangeEvent, type FormEvent, type MouseEvent } from "react";

export type ProjectCanvasKind = "erd" | "dfd";
type ProjectCanvas = { id: string; name: string };

type Props = {
  erdCanvases: ProjectCanvas[];
  dfdCanvases: ProjectCanvas[];
  active: { kind: ProjectCanvasKind; id: string };
  onSelect: (kind: ProjectCanvasKind, id: string) => void;
  onCreate: (kind: ProjectCanvasKind, name: string) => Promise<boolean>;
  onRename: (kind: ProjectCanvasKind, canvas: ProjectCanvas) => Promise<boolean>;
  onClose: () => void;
};

type EditingState = { kind: ProjectCanvasKind; id: string } | null;

export function ProjectCanvasSelectorDialog({ erdCanvases, dfdCanvases, active, onSelect, onCreate, onRename, onClose }: Props) {
  const [newNames, setNewNames] = useState<Record<ProjectCanvasKind, string>>({ erd: "", dfd: "" });
  const [editing, setEditing] = useState<EditingState>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const canvasesByKind = { erd: erdCanvases, dfd: dfdCanvases };

  const handleSelect = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    onSelect(event.currentTarget.dataset.kind as ProjectCanvasKind, event.currentTarget.dataset.canvasId!);
  }, [onSelect]);
  const handleNewName = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const kind = event.currentTarget.dataset.kind as ProjectCanvasKind;
    setNewNames((current) => ({ ...current, [kind]: event.target.value }));
  }, []);
  const handleStartRename = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    const kind = event.currentTarget.dataset.kind as ProjectCanvasKind;
    const canvas = canvasesByKind[kind].find((item) => item.id === event.currentTarget.dataset.canvasId);
    if (!canvas) return;
    setEditing({ kind, id: canvas.id });
    setRenameDraft(canvas.name);
  }, [dfdCanvases, erdCanvases]);
  const handleRenameDraft = useCallback((event: ChangeEvent<HTMLInputElement>) => setRenameDraft(event.target.value), []);
  const handleCreate = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const kind = event.currentTarget.dataset.kind as ProjectCanvasKind;
    const name = newNames[kind].trim();
    if (!name) return;
    setSaving(true);
    const created = await onCreate(kind, name);
    setSaving(false);
    if (created) startTransition(() => setNewNames((current) => ({ ...current, [kind]: "" })));
  }, [newNames, onCreate]);
  const handleRename = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing || !renameDraft.trim()) return;
    const canvas = canvasesByKind[editing.kind].find((item) => item.id === editing.id);
    if (!canvas) return;
    setSaving(true);
    const renamed = await onRename(editing.kind, { ...canvas, name: renameDraft.trim() });
    setSaving(false);
    if (renamed) startTransition(() => setEditing(null));
  }, [dfdCanvases, editing, erdCanvases, onRename, renameDraft]);

  const renderSection = (kind: ProjectCanvasKind, label: string) => {
    const Icon = kind === "erd" ? Database : Cable;
    return <section className="min-w-0 p-5"><div className="mb-3 flex items-center gap-2"><Icon size={18} className={kind === "erd" ? "text-amber-700" : "text-blue-700"} /><h3 className="font-bold">{label}</h3><span className="badge badge-ghost badge-sm">{canvasesByKind[kind].length}</span></div><div className="space-y-2">{canvasesByKind[kind].map((canvas) => <div key={canvas.id} className={`flex items-center gap-2 rounded-lg border p-2 ${active.kind === kind && active.id === canvas.id ? "border-blue-300 bg-blue-50" : "border-slate-200"}`}>{editing?.kind === kind && editing.id === canvas.id ? <form className="flex min-w-0 flex-1 gap-2" onSubmit={handleRename}><input autoFocus className="input input-bordered input-sm min-w-0 flex-1" value={renameDraft} onChange={handleRenameDraft} /><button className="btn btn-primary btn-sm btn-square" disabled={saving}><Check size={15} /></button></form> : <><button type="button" data-kind={kind} data-canvas-id={canvas.id} className="min-w-0 flex-1 px-2 py-1 text-left" onClick={handleSelect}><span className="line-clamp-2 font-bold leading-tight">{canvas.name}</span></button>{active.kind === kind && active.id === canvas.id && <span className="badge badge-primary badge-sm">Current</span>}<button type="button" data-kind={kind} data-canvas-id={canvas.id} className="btn btn-ghost btn-sm btn-square" onClick={handleStartRename} aria-label={`Rename ${canvas.name}`}><Pencil size={14} /></button></>}</div>)}</div><form data-kind={kind} className="mt-4 flex gap-2" onSubmit={handleCreate}><input data-kind={kind} className="input input-bordered input-sm min-w-0 flex-1" placeholder={`New ${kind.toUpperCase()} canvas`} value={newNames[kind]} onChange={handleNewName} /><button className="btn btn-primary btn-sm gap-1" disabled={saving || !newNames[kind].trim()}><Plus size={15} />Create</button></form></section>;
  };

  return <div className="modal modal-open" role="dialog" aria-modal="true" aria-labelledby="project-canvas-selector-title"><div className="modal-box max-w-4xl rounded-xl bg-white p-0"><header className="flex items-center justify-between border-b border-slate-200 px-6 py-4"><div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Project navigation</p><h2 id="project-canvas-selector-title" className="text-xl font-bold">ERD &amp; DFD canvases</h2></div><button type="button" className="btn btn-ghost btn-sm btn-square" onClick={onClose} aria-label="Close canvas selector"><X size={18} /></button></header><div className="grid divide-y divide-slate-200 md:grid-cols-2 md:divide-x md:divide-y-0">{renderSection("erd", "Entity relationship diagrams")}{renderSection("dfd", "Data flow diagrams")}</div></div><button className="modal-backdrop" onClick={onClose} aria-label="Close canvas selector" /></div>;
}
