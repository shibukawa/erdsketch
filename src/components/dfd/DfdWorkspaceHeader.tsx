import { FileOutput, Grid3X3, Search } from "lucide-react";
import type { Collaborator } from "../../collaboration";
import { WorkspaceProjectNavigation } from "../layout/WorkspaceProjectNavigation";
import { CoworkParticipantSummary } from "../collaboration/CoworkParticipantSummary";
import { GuidedTourButton } from "../guidedTour/GuidedTourButton";

type DfdWorkspaceHeaderProps = {
  me: Collaborator;
  users: Collaborator[];
  connected: boolean;
  canvasName: string;
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
  onOpenExport: () => void;
};

export function DfdWorkspaceHeader({ me, users, connected, canvasName, isHost, recoveryReady, persistentStorage, recoveryError, activeProject, onOpenProjectManager, onOpenCanvasSelector, onOpenModelPicker, onOpenCrudMatrix, onShareWork, onOpenExport }: DfdWorkspaceHeaderProps) {
  return <header className="z-10 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-7 py-4 shadow-sm">
    <WorkspaceProjectNavigation isHost={isHost} recoveryReady={recoveryReady} persistentStorage={persistentStorage} recoveryError={recoveryError} activeProject={activeProject} canvasName={canvasName} onOpenProjectManager={onOpenProjectManager} onOpenCanvasSelector={onOpenCanvasSelector} />
    <div className="flex items-center gap-2">
      <button data-tour="dfd-models" className="btn btn-outline btn-sm gap-2" onClick={onOpenModelPicker}><Search size={15} />Models</button>
      <button className="btn btn-outline btn-sm gap-2" onClick={onOpenCrudMatrix}><Grid3X3 size={15} />CRUD Matrix</button>
      <GuidedTourButton tour="dfd" label="DFD" />
      <CoworkParticipantSummary me={me} users={users} connected={connected} isHost={isHost} onOpenCowork={onShareWork} iconSize={15} />
      <span className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-500" : "bg-amber-500"}`} title={connected ? "Connected" : "Connecting"} />
      <span data-tour="collaborator-name" className="btn btn-ghost btn-sm pointer-events-none"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: me.color }} />{me.name}</span>
      <button type="button" className="btn btn-error btn-sm gap-2 text-white" onClick={onOpenExport}><FileOutput size={15} />Export</button>
    </div>
  </header>;
}
