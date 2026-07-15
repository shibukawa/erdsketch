import { ChevronDown, Files, Layers3 } from "lucide-react";
import { useMemo } from "react";

type Props = {
  isHost: boolean;
  recoveryReady: boolean;
  persistentStorage: boolean;
  recoveryError?: string;
  activeProject?: { displayName: string; kind: "named" | "temporary" };
  canvasName: string;
  onOpenProjectManager: () => void;
  onOpenCanvasSelector: () => void;
};

export function WorkspaceProjectNavigation({ isHost, recoveryReady, persistentStorage, recoveryError, activeProject, canvasName, onOpenProjectManager, onOpenCanvasSelector }: Props) {
  const status = useMemo(() => !isHost
    ? "The host manages recovery and project files"
    : recoveryError
      ? `Recovery storage error: ${recoveryError}`
      : recoveryReady
        ? persistentStorage ? "OPFS recovery ready (persistent storage granted)" : "OPFS recovery ready (browser may evict site data)"
        : "Preparing OPFS recovery", [isHost, persistentStorage, recoveryError, recoveryReady]);
  const statusColor = !isHost ? "bg-slate-400" : recoveryError ? "bg-red-500" : recoveryReady ? "bg-blue-500" : "bg-amber-500";

  return <div className="flex min-w-0 items-stretch gap-2">
    <button
      type="button"
      className="btn h-auto min-h-12 min-w-44 max-w-64 justify-start gap-3 rounded-xl border-slate-200 bg-slate-50 px-4 py-2 text-left shadow-sm hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800"
      disabled={isHost && !recoveryReady && !recoveryError}
      onClick={onOpenProjectManager}
      aria-label={`Open project management${activeProject ? `, current project: ${activeProject.displayName}` : ""}`}
      title={status}
    >
      <span className={`h-2 w-2 shrink-0 rounded-full ${statusColor}`} aria-label={status} />
      <Files size={20} className="shrink-0" />
      <span className="min-w-0 flex-1"><span className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">Project</span><span className="block truncate font-bold">{activeProject?.displayName ?? "Projects"}</span></span>
      {activeProject?.kind === "temporary" && <span className="badge badge-ghost badge-xs">Temp</span>}
      <ChevronDown size={16} className="shrink-0 text-slate-400" />
    </button>
    <button
      type="button"
      className="btn h-auto min-h-12 min-w-44 max-w-64 justify-start gap-3 rounded-xl border-slate-200 bg-slate-50 px-4 py-2 text-left shadow-sm hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800"
      onClick={onOpenCanvasSelector}
      aria-label={`Select canvas, current canvas: ${canvasName}`}
    >
      <Layers3 size={20} className="shrink-0" />
      <span className="min-w-0 flex-1"><span className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">Canvas</span><span className="block truncate font-bold">{canvasName}</span></span>
      <ChevronDown size={16} className="shrink-0 text-slate-400" />
    </button>
  </div>;
}
