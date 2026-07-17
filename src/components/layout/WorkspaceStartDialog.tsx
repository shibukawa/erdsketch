import { FolderCog, FolderOpen, HardDriveUpload, LoaderCircle, TriangleAlert } from "lucide-react";
import { useCallback, useMemo, useRef, useState, type ChangeEvent } from "react";
import type { StarterProjectId, StarterProjectSummary } from "../../features/modeling/starterProjects";
import { LanguageSwitcher } from "../../i18n/LanguageSwitcher";
import type { OpfsProject } from "../../persistence/projectCatalog";
import { SavedProjectList } from "./SavedProjectList";
import { StarterProjectCard } from "./StarterProjectCard";
import { getRecentProjects, RECENT_PROJECT_LIMIT } from "./recentProjects";

type Props = {
  starters: StarterProjectSummary[];
  projects: OpfsProject[];
  activeProjectId?: string;
  recoveryReady: boolean;
  recoveryError?: string;
  localFileAvailable: boolean;
  onCreateStarter: (id: StarterProjectId) => Promise<boolean>;
  onLoadProject: (projectId: string) => Promise<boolean>;
  onImportProject: (file: File) => Promise<boolean>;
  onOpenLocalProject: () => Promise<boolean>;
  onManageProjects: () => void;
};

export function WorkspaceStartDialog({ starters, projects, activeProjectId, recoveryReady, recoveryError, localFileAvailable, onCreateStarter, onLoadProject, onImportProject, onOpenLocalProject, onManageProjects }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const uploadRef = useRef<HTMLInputElement | null>(null);

  const run = useCallback(async (action: () => Promise<boolean>) => {
    setBusy(true);
    setError(null);
    try {
      const succeeded = await action();
      if (!succeeded) setError("The project could not be opened. Your current recovery data was not changed.");
      return succeeded;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  const handleStarter = useCallback((id: StarterProjectId) => { void run(() => onCreateStarter(id)); }, [onCreateStarter, run]);
  const handleSaved = useCallback((projectId: string) => { void run(() => onLoadProject(projectId)); }, [onLoadProject, run]);
  const handleUploadClick = useCallback(() => uploadRef.current?.click(), []);
  const handleUpload = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) void run(() => onImportProject(file));
  }, [onImportProject, run]);
  const handleOpenLocal = useCallback(() => { void run(onOpenLocalProject); }, [onOpenLocalProject, run]);
  const handleManage = useCallback(() => onManageProjects(), [onManageProjects]);
  const recentProjects = useMemo(() => getRecentProjects(projects), [projects]);
  const hasMoreProjects = projects.length > RECENT_PROJECT_LIMIT;
  const disabled = busy || !recoveryReady;

  return <div className="modal modal-open" role="dialog" aria-modal="true" aria-labelledby="workspace-start-title">
    <div className="modal-box flex max-h-[92vh] max-w-6xl flex-col overflow-hidden rounded-2xl bg-slate-50 p-0 shadow-2xl">
      <header className="flex shrink-0 items-start justify-between gap-5 border-b border-slate-200 bg-white px-6 py-5"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">ERDSketch</p><h2 id="workspace-start-title" className="mt-1 text-2xl font-bold">Start or open a project</h2><p className="mt-1 text-sm text-slate-600">Choose project content first. You will select an ERD or DFD canvas next.</p></div><LanguageSwitcher /></header>
      <div className="min-h-0 flex-1 space-y-7 overflow-y-auto p-6">
        {!recoveryReady && <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900"><LoaderCircle className="animate-spin" size={18} />Preparing saved projects and recovery storage…</div>}
        {(recoveryError || error) && <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert"><TriangleAlert className="mt-0.5 shrink-0" size={18} /><span>{error ?? `Recovery storage error: ${recoveryError}`}</span></div>}

        <section><div className="mb-3 flex items-end justify-between gap-3"><div><h3 className="text-lg font-bold">New project</h3><p className="text-sm text-slate-600">Start blank or explore a complete model with domains, vocabulary, ERD, and DFD.</p></div></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{starters.map((starter) => <StarterProjectCard key={starter.id} starter={starter} disabled={disabled} onSelect={handleStarter} />)}</div></section>

        <section><div className="mb-3 flex items-end justify-between gap-3"><div><h3 className="text-lg font-bold">Recent projects</h3><p className="text-sm text-slate-600">Projects saved privately in this browser and origin.</p></div><div className="flex items-center gap-2"><span className="badge badge-ghost">{projects.length}</span>{hasMoreProjects && <button type="button" className="btn btn-ghost btn-sm gap-2" disabled={busy} onClick={handleManage}><FolderCog size={16} />View all projects</button>}</div></div><SavedProjectList projects={recentProjects} activeProjectId={activeProjectId} disabled={disabled} onSelect={handleSaved} /></section>

        <section><h3 className="text-lg font-bold">Open another project</h3><p className="mt-1 text-sm text-slate-600">Upload a portable ZIP project archive. Direct local access is available only after you choose a project folder.</p><div className="mt-3 flex flex-wrap gap-3"><button type="button" className="btn btn-outline gap-2" disabled={disabled} onClick={handleUploadClick}><HardDriveUpload size={17} />Upload project archive</button><input ref={uploadRef} type="file" accept=".erdsketch.zip,.zip,application/zip" className="hidden" onChange={handleUpload} /><button type="button" className="btn btn-outline gap-2" disabled={disabled || !localFileAvailable} onClick={handleOpenLocal}><FolderOpen size={17} />Open project folder</button><button type="button" className="btn btn-ghost gap-2" disabled={busy} onClick={handleManage}><FolderCog size={17} />Manage projects</button></div>{!localFileAvailable && <p className="mt-3 text-xs text-slate-500">Direct file-system access is unavailable here. Upload still works, and browsers cannot scan local files without your permission.</p>}</section>
      </div>
      {busy && <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1 overflow-hidden bg-blue-100"><div className="h-full w-1/3 animate-pulse bg-blue-600" /></div>}
    </div>
  </div>;
}
