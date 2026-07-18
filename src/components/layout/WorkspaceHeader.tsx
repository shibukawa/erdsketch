import { FileOutput, Grid3X3, Search } from "lucide-react";
import type { Collaborator } from "../../collaboration";
import { WorkspaceProjectNavigation } from "./WorkspaceProjectNavigation";
import { CoworkParticipantSummary } from "../collaboration/CoworkParticipantSummary";
import { GuidedTourButton } from "../guidedTour/GuidedTourButton";
import { CollaboratorNameEditor } from "../collaboration/CollaboratorNameEditor";
import { useI18n } from "../../i18n/I18nProvider";
import { translateText } from "../../i18n/translations";

type WorkspaceHeaderProps = {
  me: Collaborator;
  users: Collaborator[];
  connected: boolean;
  canvasName: string;
  onRename: (name: string) => Promise<boolean>;
  onOpenCanvasSelector: () => void;
  onOpenModelCatalog: () => void;
  onOpenCrudMatrix: () => void;
  onShareWork: () => void;
  onLeaveSession?: () => void;
  isHost: boolean;
  recoveryReady: boolean;
  persistentStorage: boolean;
  recoveryError?: string;
  activeProject?: { displayName: string; kind: "named" | "temporary" };
  onOpenProjectManager: () => void;
  onOpenExport: () => void;
};

export function WorkspaceHeader({ me, users, connected, canvasName, onRename, onOpenCanvasSelector, onOpenModelCatalog, onOpenCrudMatrix, onShareWork, onLeaveSession, isHost, recoveryReady, persistentStorage, recoveryError, activeProject, onOpenProjectManager, onOpenExport }: WorkspaceHeaderProps) {
  const { locale } = useI18n();
  return (
    <header className="z-10 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-7 py-4 shadow-sm">
      <WorkspaceProjectNavigation isHost={isHost} recoveryReady={recoveryReady} persistentStorage={persistentStorage} recoveryError={recoveryError} activeProject={activeProject} canvasName={canvasName} onOpenProjectManager={onOpenProjectManager} onOpenCanvasSelector={onOpenCanvasSelector} />
      <div className="flex items-center gap-2">
        <button data-tour="erd-models" type="button" className="btn btn-outline btn-sm gap-2" onClick={onOpenModelCatalog}><Search size={16} />Models</button>
        <button type="button" className="btn btn-outline btn-sm gap-2" onClick={onOpenCrudMatrix}><Grid3X3 size={16} />CRUD Matrix</button>
        <GuidedTourButton tour="erd" label="ERD" />
        <CoworkParticipantSummary me={me} users={users} connected={connected} isHost={isHost} onOpenCowork={onShareWork} onLeaveSession={onLeaveSession} />
        <span
          className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-500" : "bg-amber-500"}`}
          title={translateText(connected ? "Connected" : "Connecting", locale)}
        />
        <CollaboratorNameEditor me={me} onRename={onRename} />
        <button type="button" className="btn btn-error btn-sm gap-2 text-white" onClick={onOpenExport}><FileOutput size={16} />Export</button>
      </div>
    </header>
  );
}
