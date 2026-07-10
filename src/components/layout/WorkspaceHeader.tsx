import { Focus, LocateFixed, ZoomIn, ZoomOut } from "lucide-react";
import { startTransition, useCallback, useState, type ChangeEvent, type FocusEvent, type FormEvent } from "react";
import type { Collaborator } from "../../collaboration";

type WorkspaceHeaderProps = {
  me: Collaborator;
  users: Collaborator[];
  connected: boolean;
  scale: number;
  onRename: (name: string) => Promise<boolean>;
  onResetView: () => void;
  onUpdateScale: (scale: number) => void;
};

export function WorkspaceHeader({ me, users, connected, scale, onRename, onResetView, onUpdateScale }: WorkspaceHeaderProps) {
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
      <div>
        <p className="text-sm font-semibold text-slate-500">Miro-like model workspace</p>
        <h2 className="text-2xl font-bold">Place model seeds anywhere</h2>
      </div>
      <div className="flex items-center gap-2">
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
        <button className="btn btn-primary btn-sm rounded-lg gap-2">
          <Focus size={16} />
          Grow Selected
        </button>
      </div>
    </header>
  );
}
