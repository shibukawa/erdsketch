import { FileOutput, Grid3X3, Search } from "lucide-react";
import { startTransition, useCallback, useState, type ChangeEvent, type FocusEvent, type FormEvent } from "react";
import type { Collaborator } from "../../collaboration";
import { WorkspaceProjectNavigation } from "./WorkspaceProjectNavigation";
import { CoworkParticipantSummary } from "../collaboration/CoworkParticipantSummary";

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
  isHost: boolean;
  recoveryReady: boolean;
  persistentStorage: boolean;
  recoveryError?: string;
  activeProject?: { displayName: string; kind: "named" | "temporary" };
  onOpenProjectManager: () => void;
  onOpenExport: () => void;
};

export function WorkspaceHeader({ me, users, connected, canvasName, onRename, onOpenCanvasSelector, onOpenModelCatalog, onOpenCrudMatrix, onShareWork, isHost, recoveryReady, persistentStorage, recoveryError, activeProject, onOpenProjectManager, onOpenExport }: WorkspaceHeaderProps) {
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(me.name);
  const saveName = useCallback(async () => {
    if (await onRename(nameDraft)) {
      startTransition(() => {
        setEditingName(false);
      });
    }
  }, [nameDraft, onRename]);

  const handleNameSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      void saveName();
    },
    [saveName]
  );

  const handleNameChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setNameDraft(event.target.value);
  }, []);

  const handleNameBlur = useCallback(
    (_event: FocusEvent<HTMLInputElement>) => {
      void saveName();
    },
    [saveName]
  );

  const handleStartEditing = useCallback(() => {
    setNameDraft(me.name);
    setEditingName(true);
  }, [me.name]);

  return (
    <header className="z-10 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-7 py-4 shadow-sm">
      <WorkspaceProjectNavigation isHost={isHost} recoveryReady={recoveryReady} persistentStorage={persistentStorage} recoveryError={recoveryError} activeProject={activeProject} canvasName={canvasName} onOpenProjectManager={onOpenProjectManager} onOpenCanvasSelector={onOpenCanvasSelector} />
      <div className="flex items-center gap-2">
        <button type="button" className="btn btn-outline btn-sm gap-2" onClick={onOpenModelCatalog}><Search size={16} />Models</button>
        <button type="button" className="btn btn-outline btn-sm gap-2" onClick={onOpenCrudMatrix}><Grid3X3 size={16} />CRUD Matrix</button>
        <CoworkParticipantSummary me={me} users={users} connected={connected} isHost={isHost} onOpenCowork={onShareWork} />
        <span
          className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-500" : "bg-amber-500"}`}
          title={connected ? "Connected" : "Connecting"}
        />
        {editingName ? (
          <form className="flex items-center gap-1" onSubmit={handleNameSubmit}>
            <input
              autoFocus
              className="input input-bordered input-sm w-28 rounded-lg"
              value={nameDraft}
              maxLength={24}
              onChange={handleNameChange}
              onBlur={handleNameBlur}
              aria-label="Your collaborator name"
            />
          </form>
        ) : (
          <button className="btn btn-ghost btn-sm rounded-lg px-2" onClick={handleStartEditing} title="Change your name">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: me.color }} />
            {me.name}
          </button>
        )}
        <button type="button" className="btn btn-error btn-sm gap-2 text-white" onClick={onOpenExport}><FileOutput size={16} />Export</button>
      </div>
    </header>
  );
}
