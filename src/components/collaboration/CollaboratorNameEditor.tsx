import { startTransition, useCallback, useState, type ChangeEvent, type FocusEvent, type FormEvent } from "react";
import type { Collaborator } from "../../collaboration";

type CollaboratorNameEditorProps = {
  me: Collaborator;
  onRename: (name: string) => Promise<boolean>;
};

export function CollaboratorNameEditor({ me, onRename }: CollaboratorNameEditorProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(me.name);

  const save = useCallback(async () => {
    if (await onRename(draft)) startTransition(() => setEditing(false));
  }, [draft, onRename]);
  const handleSubmit = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void save();
  }, [save]);
  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => setDraft(event.target.value), []);
  const handleBlur = useCallback((_event: FocusEvent<HTMLInputElement>) => { void save(); }, [save]);
  const handleStartEditing = useCallback(() => {
    setDraft(me.name);
    setEditing(true);
  }, [me.name]);

  return <div data-tour="collaborator-name">
    {editing ? <form className="flex items-center gap-1" onSubmit={handleSubmit}>
      <input autoFocus className="input input-bordered input-sm w-28 rounded-lg" value={draft} maxLength={24} onChange={handleChange} onBlur={handleBlur} aria-label="Your collaborator name" />
    </form> : <button className="btn btn-ghost btn-sm rounded-lg px-2" onClick={handleStartEditing} title="Change your name">
      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: me.color }} /><span data-i18n-skip>{me.name}</span>
    </button>}
  </div>;
}
