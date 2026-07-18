import { Check, Clock3, CopyPlus, Download, FilePlus2, FolderOpen, Pencil, Trash2, Upload } from "lucide-react";
import { startTransition, useCallback, useRef, useState, type ChangeEvent, type FormEvent, type MouseEvent } from "react";
import type { OpfsProject } from "../../persistence/projectCatalog";

type Props = {
  projects: OpfsProject[];
  activeProjectId?: string;
  disabled: boolean;
  run: (action: () => Promise<boolean>) => Promise<boolean>;
  onCreate: (displayName: string) => Promise<boolean>;
  onSaveAs: (displayName: string) => Promise<boolean>;
  onLoad: (projectId: string) => Promise<boolean>;
  onRename: (projectId: string, displayName: string) => Promise<boolean>;
  onDelete: (projectId: string) => Promise<boolean>;
  onExport: () => Promise<boolean>;
  onImport: (file: File) => Promise<boolean>;
  onClose: () => void;
};

function formattedDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function OriginPrivateStoragePanel({ projects, activeProjectId, disabled, run, onCreate, onSaveAs, onLoad, onRename, onDelete, onExport, onImport, onClose }: Props) {
  const [nameDraft, setNameDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement | null>(null);

  const handleNameDraft = useCallback((event: ChangeEvent<HTMLInputElement>) => setNameDraft(event.target.value), []);
  const handleRenameDraft = useCallback((event: ChangeEvent<HTMLInputElement>) => setRenameDraft(event.target.value), []);
  const handleCreate = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = nameDraft.trim();
    if (name && await run(() => onCreate(name))) startTransition(() => setNameDraft(""));
  }, [nameDraft, onCreate, run]);
  const handleSaveAs = useCallback(async () => {
    const name = nameDraft.trim();
    if (name && await run(() => onSaveAs(name))) startTransition(() => setNameDraft(""));
  }, [nameDraft, onSaveAs, run]);
  const handleLoad = useCallback(async (event: MouseEvent<HTMLButtonElement>) => {
    if (await run(() => onLoad(event.currentTarget.dataset.projectId!))) onClose();
  }, [onClose, onLoad, run]);
  const handleStartRename = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    const project = projects.find((candidate) => candidate.projectId === event.currentTarget.dataset.projectId);
    if (!project) return;
    setEditingId(project.projectId);
    setRenameDraft(project.displayName);
    setDeleteId(null);
  }, [projects]);
  const handleRename = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (editingId && renameDraft.trim() && await run(() => onRename(editingId, renameDraft))) startTransition(() => setEditingId(null));
  }, [editingId, onRename, renameDraft, run]);
  const handleAskDelete = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    setDeleteId(event.currentTarget.dataset.projectId!);
    setEditingId(null);
  }, []);
  const handleCancelDelete = useCallback(() => setDeleteId(null), []);
  const handleDelete = useCallback(async () => {
    if (deleteId && await run(() => onDelete(deleteId))) startTransition(() => setDeleteId(null));
  }, [deleteId, onDelete, run]);
  const handleExport = useCallback(() => { void run(onExport); }, [onExport, run]);
  const handleImportClick = useCallback(() => importRef.current?.click(), []);
  const handleImport = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file && await run(() => onImport(file))) onClose();
  }, [onClose, onImport, run]);

  return <div className="grid min-h-0 flex-1 gap-6 overflow-y-auto p-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] md:overflow-hidden" role="tabpanel">
    <section>
      <h3 className="font-bold">Create or save a copy</h3>
      <p className="mt-1 text-sm text-slate-600">Projects are stored privately for this browser and origin. Save As copies the current project under a new internal ID.</p>
      <form className="mt-4" onSubmit={handleCreate}>
        <label className="form-control"><span className="label-text mb-1 text-sm font-semibold">Project name</span><input autoFocus className="input input-bordered w-full" maxLength={100} placeholder="Customer ordering" value={nameDraft} disabled={disabled} onChange={handleNameDraft} /></label>
        <div className="mt-4 flex flex-wrap gap-2"><button className="btn btn-primary btn-sm gap-2" disabled={disabled || !nameDraft.trim()}><FilePlus2 size={16} />New project</button><button type="button" className="btn btn-outline btn-sm gap-2" disabled={disabled || !nameDraft.trim()} onClick={handleSaveAs}><CopyPlus size={16} />Save current as</button></div>
      </form>
      <div className="mt-5 rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-950"><strong>Continuous recovery stays on.</strong><p className="mt-1">Each project has its own checkpoint and journal.</p></div>
      <div className="mt-4 rounded-lg border border-slate-200 p-4"><h3 className="font-bold">Portable ZIP archive</h3><p className="mt-1 text-sm text-slate-600">Move a project between browsers or keep a user-visible backup.</p><div className="mt-3 flex gap-2"><button type="button" className="btn btn-outline btn-sm gap-2" disabled={disabled} onClick={handleImportClick}><Upload size={16} />Import</button><button type="button" className="btn btn-outline btn-sm gap-2" disabled={disabled} onClick={handleExport}><Download size={16} />Export</button></div><input ref={importRef} type="file" accept=".erdsketch.zip,.zip,application/zip" className="hidden" onChange={handleImport} /></div>
    </section>

    <section className="flex min-h-0 min-w-0 flex-col"><div className="mb-3 flex shrink-0 items-center justify-between"><h3 className="font-bold">Projects in this browser</h3><span className="badge badge-ghost">{projects.length}</span></div><div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
      {projects.length === 0 && <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">No browser project list is available in this session.</p>}
      {projects.map((project) => <article key={project.projectId} className={`rounded-xl border p-3 ${project.projectId === activeProjectId ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white"}`}>
        {deleteId === project.projectId ? <div><p className="font-bold text-red-700">Delete “<span data-i18n-skip>{project.displayName}</span>”?</p><p className="mt-1 text-sm text-slate-600">Its OPFS checkpoint and recovery journal will be removed.</p><div className="mt-3 flex gap-2"><button type="button" className="btn btn-error btn-sm" disabled={disabled} onClick={handleDelete}>Delete project</button><button type="button" className="btn btn-ghost btn-sm" disabled={disabled} onClick={handleCancelDelete}>Cancel</button></div></div> : editingId === project.projectId ? <form className="flex gap-2" onSubmit={handleRename}><input autoFocus className="input input-bordered input-sm min-w-0 flex-1" maxLength={100} value={renameDraft} disabled={disabled} onChange={handleRenameDraft} aria-label={`New name for ${project.displayName}`} /><button className="btn btn-primary btn-sm btn-square" disabled={disabled || !renameDraft.trim()} aria-label="Save project name"><Check size={16} /></button></form> : <div className="flex items-center gap-3"><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h4 data-i18n-skip className="truncate font-bold">{project.displayName}</h4>{project.projectId === activeProjectId && <span className="badge badge-primary badge-sm">Current</span>}<span className="badge badge-ghost badge-sm">{project.kind === "temporary" ? "Temporary" : "Named"}</span></div><p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><Clock3 size={12} /><span data-i18n-skip>{formattedDate(project.updatedAt)} · {project.projectId.slice(0, 8)}</span></p></div>{project.projectId !== activeProjectId && <button type="button" data-project-id={project.projectId} className="btn btn-outline btn-sm gap-1" disabled={disabled} onClick={handleLoad}><FolderOpen size={15} />Load</button>}<button type="button" data-project-id={project.projectId} className="btn btn-ghost btn-sm btn-square" disabled={disabled} onClick={handleStartRename} aria-label={`Rename ${project.displayName}`}><Pencil size={15} /></button><button type="button" data-project-id={project.projectId} className="btn btn-ghost btn-sm btn-square text-red-600" disabled={disabled} onClick={handleAskDelete} aria-label={`Delete ${project.displayName}`}><Trash2 size={15} /></button></div>}
      </article>)}
    </div></section>
  </div>;
}
