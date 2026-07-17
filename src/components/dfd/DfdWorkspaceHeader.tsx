import { Grid3X3, LocateFixed, Search, ZoomIn, ZoomOut } from "lucide-react";
import { useCallback } from "react";
import type { Collaborator } from "../../collaboration";
import { WorkspaceProjectNavigation } from "../layout/WorkspaceProjectNavigation";
import { CoworkParticipantSummary } from "../collaboration/CoworkParticipantSummary";
import { LanguageSwitcher } from "../../i18n/LanguageSwitcher";

type DfdWorkspaceHeaderProps = {
  me: Collaborator;
  users: Collaborator[];
  connected: boolean;
  canvasName: string;
  scale: number;
  isHost: boolean;
  recoveryReady: boolean;
  persistentStorage: boolean;
  recoveryError?: string;
  activeProject?: { displayName: string; kind: "named" | "temporary" };
  onOpenProjectManager: () => void;
  onOpenCanvasSelector: () => void;
  onOpenModelPicker: () => void;
  onOpenCrudMatrix: () => void;
  onShareWork: () => void;
  onResetView: () => void;
  onUpdateScale: (scale: number) => void;
};

export function DfdWorkspaceHeader({ me, users, connected, canvasName, scale, isHost, recoveryReady, persistentStorage, recoveryError, activeProject, onOpenProjectManager, onOpenCanvasSelector, onOpenModelPicker, onOpenCrudMatrix, onShareWork, onResetView, onUpdateScale }: DfdWorkspaceHeaderProps) {
  const zoomOut = useCallback(() => onUpdateScale(scale * 0.85), [onUpdateScale, scale]);
  const zoomIn = useCallback(() => onUpdateScale(scale * 1.15), [onUpdateScale, scale]);
  return <header className="z-10 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-7 py-4 shadow-sm">
    <WorkspaceProjectNavigation isHost={isHost} recoveryReady={recoveryReady} persistentStorage={persistentStorage} recoveryError={recoveryError} activeProject={activeProject} canvasName={canvasName} onOpenProjectManager={onOpenProjectManager} onOpenCanvasSelector={onOpenCanvasSelector} />
    <div className="flex items-center gap-2">
      <LanguageSwitcher />
      <button className="btn btn-outline btn-sm gap-2" onClick={onOpenModelPicker}><Search size={15} />Models</button>
      <button className="btn btn-outline btn-sm gap-2" onClick={onOpenCrudMatrix}><Grid3X3 size={15} />CRUD Matrix</button>
      <CoworkParticipantSummary me={me} users={users} connected={connected} isHost={isHost} onOpenCowork={onShareWork} iconSize={15} />
      <span className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-500" : "bg-amber-500"}`} title={connected ? "Connected" : "Connecting"} />
      <span className="btn btn-ghost btn-sm pointer-events-none"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: me.color }} />{me.name}</span>
      <button className="btn btn-outline btn-sm gap-2" onClick={onResetView}><LocateFixed size={15} />Reset</button>
      <div className="join"><button className="btn join-item btn-sm" aria-label="Zoom out" onClick={zoomOut}><ZoomOut size={15} /></button><span className="join-item flex h-8 min-w-16 items-center justify-center border-y border-slate-300 bg-white px-3 text-sm font-semibold">{Math.round(scale * 100)}%</span><button className="btn join-item btn-sm" aria-label="Zoom in" onClick={zoomIn}><ZoomIn size={15} /></button></div>
    </div>
  </header>;
}
