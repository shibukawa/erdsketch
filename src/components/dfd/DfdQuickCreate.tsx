import { useCallback, useRef, useState, type ChangeEvent, type FormEvent } from "react";

export type DfdQuickCreateKind = "batch" | "ui" | "model" | "file" | "queue" | "external";

type DfdQuickCreateProps = {
  onCreate: (kind: DfdQuickCreateKind, name: string) => Promise<boolean> | boolean;
};

const options: Array<{ kind: DfdQuickCreateKind; label: string }> = [
  { kind: "batch", label: "Batch" }, { kind: "ui", label: "UI" }, { kind: "model", label: "Model" },
  { kind: "file", label: "File" }, { kind: "queue", label: "Queue" }, { kind: "external", label: "External" }
];

export function DfdQuickCreate({ onCreate }: DfdQuickCreateProps) {
  const [kind, setKind] = useState<DfdQuickCreateKind>("batch");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const handleKindChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setKind(event.currentTarget.value as DfdQuickCreateKind);
    inputRef.current?.focus();
  }, []);
  const handleNameChange = useCallback((event: ChangeEvent<HTMLInputElement>) => setName(event.currentTarget.value), []);
  const handleSubmit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = name.trim();
    if (!normalized || saving) return;
    setSaving(true);
    const created = await onCreate(kind, normalized);
    setSaving(false);
    if (created) setName("");
    inputRef.current?.focus();
  }, [kind, name, onCreate, saving]);
  return <form onSubmit={handleSubmit} className="mt-2 space-y-2">
    <div role="radiogroup" aria-label="DFD item type" className="grid grid-cols-3 gap-1.5">{options.map((option) => <label key={option.kind} className={`btn btn-xs ${kind === option.kind ? "btn-primary" : "btn-outline"}`}><input type="radio" className="sr-only" name="dfd-kind" value={option.kind} checked={kind === option.kind} onChange={handleKindChange} />{option.label}</label>)}</div>
    <div className="join intent-add w-full rounded-lg"><input ref={inputRef} className="input input-sm input-bordered join-item min-w-0 flex-1 bg-transparent" value={name} disabled={saving} onChange={handleNameChange} placeholder={`New ${kind} name`} aria-label="New DFD item name" /><button className="btn btn-primary btn-sm join-item" disabled={!name.trim() || saving}>Add</button></div>
    <p className="text-[11px] text-slate-500">Enter creates the selected type and keeps this input ready.</p>
  </form>;
}
