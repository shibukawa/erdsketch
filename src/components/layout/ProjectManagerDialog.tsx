import { Database, FilePlus2, FolderOpen, X } from "lucide-react";
import { startTransition, useCallback, useState } from "react";
import type { StarterProjectId, StarterProjectSummary } from "../../features/modeling/starterProjects";
import type { OpfsProject } from "../../persistence/projectCatalog";
import { FileSystemStoragePanel } from "./FileSystemStoragePanel";
import { NewProjectPanel } from "./NewProjectPanel";
import { OriginPrivateStoragePanel } from "./OriginPrivateStoragePanel";
import { LanguageSwitcher } from "../../i18n/LanguageSwitcher";

type StorageTab = "new" | "opfs" | "filesystem";

type Props = {
  projects: OpfsProject[];
  activeProjectId?: string;
  isHost: boolean;
  recoveryReady: boolean;
  recoveryError?: string;
  fileSystemAvailable: boolean;
  starters: StarterProjectSummary[];
  onCreateStarter: (id: StarterProjectId) => Promise<boolean>;
  onCreate: (displayName: string) => Promise<boolean>;
  onSaveAs: (displayName: string) => Promise<boolean>;
  onLoad: (projectId: string) => Promise<boolean>;
  onRename: (projectId: string, displayName: string) => Promise<boolean>;
  onDelete: (projectId: string) => Promise<boolean>;
  onOpenFileSystem: () => Promise<boolean>;
  onSaveFileSystem: () => Promise<boolean>;
  onExport: () => Promise<boolean>;
  onImport: (file: File) => Promise<boolean>;
  onClose: () => void;
};

export function ProjectManagerDialog({ projects, activeProjectId, isHost, recoveryReady, recoveryError, fileSystemAvailable, starters, onCreateStarter, onCreate, onSaveAs, onLoad, onRename, onDelete, onOpenFileSystem, onSaveFileSystem, onExport, onImport, onClose }: Props) {
  const [tab, setTab] = useState<StorageTab>("opfs");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canManage = isHost && recoveryReady;

  const run = useCallback(async (action: () => Promise<boolean>) => {
    setBusy(true);
    setError(null);
    const succeeded = await action().catch(() => false);
    startTransition(() => {
      setBusy(false);
      if (!succeeded) setError("The project operation failed. Review the recovery status and try again.");
    });
    return succeeded;
  }, []);

  const showNew = useCallback(() => {
    setTab("new");
    setError(null);
  }, []);
  const showOpfs = useCallback(() => {
    setTab("opfs");
    setError(null);
  }, []);
  const showFileSystem = useCallback(() => {
    setTab("filesystem");
    setError(null);
  }, []);

  return <div className="modal modal-open" role="dialog" aria-modal="true" aria-labelledby="project-manager-title" data-ai-assistant-disabled>
    <div className="modal-box flex h-[calc(100dvh-2rem)] max-h-[760px] max-w-5xl flex-col overflow-hidden rounded-xl bg-white p-0 shadow-2xl">
      <header className="shrink-0 flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <div><p className="text-xs font-bold uppercase tracking-wide text-blue-700">Project storage</p><h2 id="project-manager-title" className="text-xl font-bold">Project Management</h2><p className="mt-1 text-sm text-slate-600">Manage browser projects, files, and portable archives from one place.</p></div>
        <div className="flex items-center gap-2"><LanguageSwitcher /><button type="button" className="btn btn-ghost btn-sm btn-square" onClick={onClose} aria-label="Close project manager"><X size={18} /></button></div>
      </header>

      <div className="shrink-0 border-b border-slate-200 px-6 pt-3" role="tablist" aria-label="Project storage">
        <button type="button" role="tab" aria-selected={tab === "new"} className={`btn btn-ghost rounded-b-none border-b-2 px-4 ${tab === "new" ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500"}`} onClick={showNew}><FilePlus2 size={17} />Create new</button>
        <button type="button" role="tab" aria-selected={tab === "opfs"} className={`btn btn-ghost rounded-b-none border-b-2 px-4 ${tab === "opfs" ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500"}`} onClick={showOpfs}><Database size={17} />Origin Private Storage</button>
        <button type="button" role="tab" aria-selected={tab === "filesystem"} className={`btn btn-ghost rounded-b-none border-b-2 px-4 ${tab === "filesystem" ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500"}`} onClick={showFileSystem}><FolderOpen size={17} />File System</button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto md:overflow-hidden">
        {!isHost && <p className="mx-6 mt-5 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">The session host manages project storage. You can review the current project but cannot run durable project actions.</p>}
        {recoveryError && <p className="mx-6 mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">Recovery storage error: {recoveryError}</p>}
        {error && <p className="mx-6 mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}

        {tab === "new" && <NewProjectPanel starters={starters} disabled={!canManage || busy} run={run} onCreateStarter={onCreateStarter} />}
        {tab === "opfs" && <OriginPrivateStoragePanel projects={projects} activeProjectId={activeProjectId} disabled={!canManage || busy} run={run} onCreate={onCreate} onSaveAs={onSaveAs} onLoad={onLoad} onRename={onRename} onDelete={onDelete} onExport={onExport} onImport={onImport} onClose={onClose} />}
        {tab === "filesystem" && <FileSystemStoragePanel available={fileSystemAvailable} disabled={!canManage || busy} run={run} onOpen={onOpenFileSystem} onSave={onSaveFileSystem} onClose={onClose} onShowOriginPrivate={showOpfs} />}
      </div>
    </div>
    <button className="modal-backdrop" onClick={onClose} aria-label="Close project manager" />
  </div>;
}
