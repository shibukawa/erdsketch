import { Cable, Database, FolderOpen } from "lucide-react";
import { useCallback, type MouseEvent } from "react";

type WorkspaceKind = "erd" | "dfd";

type Props = {
  onStart: (kind: WorkspaceKind) => void;
  onManageProjects: () => void;
};

export function WorkspaceStartDialog({ onStart, onManageProjects }: Props) {
  const handleStart = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    onStart(event.currentTarget.dataset.kind as WorkspaceKind);
  }, [onStart]);
  const handleManageProjects = useCallback(() => onManageProjects(), [onManageProjects]);

  return <div className="modal modal-open" role="dialog" aria-modal="true" aria-labelledby="workspace-start-title">
    <div className="modal-box max-w-3xl rounded-2xl bg-white p-0 shadow-2xl">
      <header className="border-b border-slate-200 px-7 py-6"><p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">ERDSketch</p><h2 id="workspace-start-title" className="mt-1 text-2xl font-bold">Where would you like to start?</h2><p className="mt-2 text-sm text-slate-600">ERD and DFD share the same project models. You can move between both at any time.</p></header>
      <div className="grid gap-3 p-7 md:grid-cols-3">
        <button type="button" data-kind="erd" className="group rounded-xl border border-slate-200 p-5 text-left transition hover:border-amber-400 hover:bg-amber-50" onClick={handleStart}><Database size={28} className="text-amber-700" /><strong className="mt-4 block text-lg">Start with ERD</strong><span className="mt-2 block text-sm text-slate-600">Shape the data models and their relationships first.</span></button>
        <button type="button" data-kind="dfd" className="group rounded-xl border border-slate-200 p-5 text-left transition hover:border-blue-400 hover:bg-blue-50" onClick={handleStart}><Cable size={28} className="text-blue-700" /><strong className="mt-4 block text-lg">Start with DFD</strong><span className="mt-2 block text-sm text-slate-600">Map processes, stores, files, queues, and external entities first.</span></button>
        <button type="button" className="group rounded-xl border border-slate-200 p-5 text-left transition hover:border-emerald-400 hover:bg-emerald-50" onClick={handleManageProjects}><FolderOpen size={28} className="text-emerald-700" /><strong className="mt-4 block text-lg">Open project manager</strong><span className="mt-2 block text-sm text-slate-600">Choose browser storage, the file system, or a portable archive.</span></button>
      </div>
    </div>
  </div>;
}
