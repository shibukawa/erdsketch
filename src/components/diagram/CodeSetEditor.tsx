import { GripVertical, Plus, Trash2 } from "lucide-react";
import { useCallback, useState, type ChangeEvent, type DragEvent, type FocusEvent, type KeyboardEvent, type MouseEvent } from "react";
import type { CodeSetBaseType, CodeSetEntry } from "../../features/modeling/types";

type CodeSetEditorProps = {
  baseType: CodeSetBaseType;
  entries: CodeSetEntry[];
  canEdit: boolean;
  onChange: (baseType: CodeSetBaseType, entries: CodeSetEntry[]) => void;
};

function createEntry(name: string): CodeSetEntry {
  return { id: crypto.randomUUID(), name, value: "" };
}

export function CodeSetEditor({ baseType, entries, canEdit, onChange }: CodeSetEditorProps) {
  const [quickEntry, setQuickEntry] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  const handleBaseTypeChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    onChange(event.target.value as CodeSetBaseType, entries);
  }, [entries, onChange]);

  const handleQuickEntryChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setQuickEntry(event.target.value);
  }, []);

  const handleQuickEntryKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter" || event.nativeEvent.isComposing || event.keyCode === 229) return;
    event.preventDefault();
    const name = quickEntry.trim();
    if (!canEdit || !name) return;
    if (entries.some((entry) => entry.name === name)) {
      window.alert("Code names must be unique within a code set.");
      return;
    }
    onChange(baseType, [...entries, createEntry(name)]);
    setQuickEntry("");
  }, [baseType, canEdit, entries, onChange, quickEntry]);

  const commitEntryInput = useCallback((input: HTMLInputElement) => {
    const id = input.dataset.entryId;
    const field = input.dataset.field as "name" | "value";
    const current = entries.find((entry) => entry.id === id);
    if (!id || !current) return;
    const value = input.value.trim();
    if (field === "name" && (!value || entries.some((entry) => entry.id !== id && entry.name === value))) {
      input.value = current.name;
      window.alert("Code names must be non-empty and unique within a code set.");
      return;
    }
    if (field === "value" && value && baseType === "integer" && !/^-?\d+$/.test(value)) {
      input.value = current.value;
      window.alert("Enter an integer value.");
      return;
    }
    if (field === "value" && value && baseType === "decimal" && !/^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value)) {
      input.value = current.value;
      window.alert("Enter a decimal value.");
      return;
    }
    if (value !== current[field]) onChange(baseType, entries.map((entry) => entry.id === id ? { ...entry, [field]: value } : entry));
  }, [baseType, entries, onChange]);

  const handleEntryCommit = useCallback((event: FocusEvent<HTMLInputElement>) => {
    commitEntryInput(event.currentTarget);
  }, [commitEntryInput]);

  const handleInputKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    if (event.key === "Escape") event.currentTarget.value = event.currentTarget.defaultValue;
    if (event.key === "Enter") commitEntryInput(event.currentTarget);
    if (event.key === "Enter" || event.key === "Escape") event.currentTarget.blur();
  }, [commitEntryInput]);

  const handleRemove = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    const id = event.currentTarget.dataset.entryId;
    if (id) onChange(baseType, entries.filter((entry) => entry.id !== id));
  }, [baseType, entries, onChange]);

  const handleDragStart = useCallback((event: DragEvent<HTMLSpanElement>) => {
    const id = event.currentTarget.dataset.entryId ?? "";
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("application/x-erdsketch-code-entry-id", id);
    setDraggingId(id);
  }, []);

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    if (!event.dataTransfer.types.includes("application/x-erdsketch-code-entry-id")) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDropTargetId(event.currentTarget.dataset.entryId ?? null);
  }, []);

  const clearDrag = useCallback(() => {
    setDraggingId(null);
    setDropTargetId(null);
  }, []);

  const handleDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const sourceId = draggingId ?? event.dataTransfer.getData("application/x-erdsketch-code-entry-id");
    const targetId = event.currentTarget.dataset.entryId;
    if (!sourceId || !targetId || sourceId === targetId) return clearDrag();
    const source = entries.find((entry) => entry.id === sourceId);
    const remaining = entries.filter((entry) => entry.id !== sourceId);
    const targetIndex = remaining.findIndex((entry) => entry.id === targetId);
    if (source && targetIndex >= 0) onChange(baseType, [...remaining.slice(0, targetIndex), source, ...remaining.slice(targetIndex)]);
    clearDrag();
  }, [baseType, clearDrag, draggingId, entries, onChange]);

  return (
    <div className="space-y-3 rounded-lg border border-violet-200 bg-violet-50 p-3">
      <div><p className="text-sm font-bold text-violet-950">Code set</p><p className="mt-1 text-xs text-violet-700">Named codes stored as a scalar value. This does not create a database enum.</p></div>
      <label className="flex flex-col"><span className="mb-1 text-xs font-bold text-slate-600">Storage type</span><select className="select select-bordered w-full bg-white" value={baseType} onChange={handleBaseTypeChange} disabled={!canEdit}><option value="varchar">Varchar</option><option value="decimal">Decimal</option><option value="integer">Integer</option></select></label>
      <label className="input input-bordered flex h-10 items-center gap-2 bg-white"><Plus size={15} className="text-slate-400" /><input className="min-w-0 grow text-sm" value={quickEntry} onChange={handleQuickEntryChange} onKeyDown={handleQuickEntryKeyDown} disabled={!canEdit} placeholder="Type name and press Enter" aria-label="New code name" /><kbd className="kbd kbd-sm bg-slate-50 text-slate-500">Enter</kbd></label>
      <div className="space-y-2" aria-label="Code set entries">
        {entries.map((entry, index) => <div key={entry.id} data-entry-id={entry.id} className={`grid grid-cols-[auto_1fr_1fr_auto] items-center gap-2 rounded-md border bg-white p-2 ${dropTargetId === entry.id ? "border-violet-500 ring-2 ring-violet-200" : "border-slate-200"} ${draggingId === entry.id ? "opacity-40" : ""}`} onDragOver={handleDragOver} onDrop={handleDrop}><span className="cursor-grab text-slate-300 active:cursor-grabbing" data-entry-id={entry.id} draggable={canEdit} onDragStart={handleDragStart} onDragEnd={clearDrag} aria-label={`Drag ${entry.name} to reorder`}><GripVertical size={15} /></span><input key={`${entry.id}:name:${entry.name}`} className="input input-bordered input-sm min-w-0 bg-white font-mono text-xs font-semibold" data-entry-id={entry.id} data-field="name" defaultValue={entry.name} onBlur={handleEntryCommit} onKeyDown={handleInputKeyDown} disabled={!canEdit} aria-label={`Code ${index + 1} name`} /><input key={`${entry.id}:value:${entry.value}`} className="input input-bordered input-sm min-w-0 bg-white font-mono text-xs" data-entry-id={entry.id} data-field="value" defaultValue={entry.value} onBlur={handleEntryCommit} onKeyDown={handleInputKeyDown} disabled={!canEdit} inputMode={baseType === "varchar" ? "text" : "decimal"} placeholder="Value" aria-label={`${entry.name} value`} /><button type="button" className="btn btn-ghost btn-xs btn-square text-red-600" data-entry-id={entry.id} onClick={handleRemove} disabled={!canEdit} aria-label={`Remove ${entry.name}`}><Trash2 size={14} /></button></div>)}
        {entries.length === 0 && <p className="rounded-md border border-dashed border-violet-200 bg-white px-3 py-4 text-center text-xs text-slate-500">No codes yet. Add a name above, then enter its stored value.</p>}
      </div>
    </div>
  );
}
