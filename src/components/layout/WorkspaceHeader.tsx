import { ChevronDown, Grid3X3, Layers3, LocateFixed, Search, ZoomIn, ZoomOut } from "lucide-react";
import { startTransition, useCallback, useState, type ChangeEvent, type FocusEvent, type FormEvent } from "react";
import type { Collaborator } from "../../collaboration";

type WorkspaceHeaderProps = {
  me: Collaborator;
  users: Collaborator[];
  connected: boolean;
  scale: number;
  canvasName: string;
  onRename: (name: string) => Promise<boolean>;
  onResetView: () => void;
  onUpdateScale: (scale: number) => void;
  onOpenCanvasSelector: () => void;
  onOpenModelCatalog: () => void;
  onOpenCrudMatrix: () => void;
};

export function WorkspaceHeader({ me, users, connected, scale, canvasName, onRename, onResetView, onUpdateScale, onOpenCanvasSelector, onOpenModelCatalog, onOpenCrudMatrix }: WorkspaceHeaderProps) {
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(me.name);
  const otherUsers = users.filter((user) => user.id !== me.id);

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

  const handleZoomOut = useCallback(() => {
    onUpdateScale(scale * 0.85);
  }, [onUpdateScale, scale]);

  const handleZoomIn = useCallback(() => {
    onUpdateScale(scale * 1.15);
  }, [onUpdateScale, scale]);

  return (
    <header className="z-10 flex items-center justify-between border-b border-slate-200 bg-white px-7 py-4 shadow-sm">
      <button
        type="button"
        className="btn h-auto min-h-12 max-w-[360px] justify-start gap-3 rounded-xl border-slate-200 bg-slate-50 px-4 py-2 text-left shadow-sm hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800"
        onClick={onOpenCanvasSelector}
        aria-label={`Select canvas, current canvas: ${canvasName}`}
      >
        <Layers3 size={24} className="shrink-0" />
        <span className="truncate text-xl font-bold">{canvasName}</span>
        <ChevronDown size={18} className="ml-1 shrink-0 text-slate-400" />
      </button>
      <div className="flex items-center gap-2">
        <button type="button" className="btn btn-outline btn-sm gap-2" onClick={onOpenModelCatalog}><Search size={16} />Models</button>
        <button type="button" className="btn btn-outline btn-sm gap-2" onClick={onOpenCrudMatrix}><Grid3X3 size={16} />CRUD Matrix</button>
        <div className="mr-1 flex -space-x-2" aria-label={`${users.length} collaborators online`}>
          {otherUsers.slice(0, 4).map((user) => (
            <span
              key={user.id}
              className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-xs font-bold text-white"
              style={{ backgroundColor: user.color }}
              title={user.name}
            >
              {user.name.slice(0, 1).toUpperCase()}
            </span>
          ))}
        </div>
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
        <button className="btn btn-outline btn-sm rounded-lg gap-2" onClick={onResetView}>
          <LocateFixed size={16} />
          Reset
        </button>
        <div className="join">
          <button className="btn join-item btn-sm" onClick={handleZoomOut} aria-label="Zoom out">
            <ZoomOut size={16} />
          </button>
          <span className="join-item flex h-8 min-w-16 items-center justify-center border-y border-slate-300 bg-white px-3 text-sm font-semibold">
            {Math.round(scale * 100)}%
          </span>
          <button className="btn join-item btn-sm" onClick={handleZoomIn} aria-label="Zoom in">
            <ZoomIn size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
