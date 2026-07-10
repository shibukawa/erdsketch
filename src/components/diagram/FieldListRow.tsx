import { GripVertical, Star, Trash2 } from "lucide-react";
import {
  useCallback,
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
  type MouseEvent
} from "react";
import type { ModelField } from "../../features/modeling/types";

type FieldListRowProps = {
  field: ModelField;
  selected: boolean;
  dragging: boolean;
  dropTarget: boolean;
  canEdit: boolean;
  onSelect: (fieldId: string) => void;
  onNameChange: (fieldId: string, name: string) => void;
  onTogglePrimaryKey: (fieldId: string) => void;
  onToggleImportant: (fieldId: string) => void;
  onDelete: (fieldId: string) => void;
  onDragStart: (event: DragEvent<HTMLElement>, fieldId: string) => void;
  onDragOver: (event: DragEvent<HTMLElement>, fieldId: string) => void;
  onDrop: (event: DragEvent<HTMLElement>, fieldId: string) => void;
  onDragEnd: () => void;
};

export function FieldListRow({
  field,
  selected,
  dragging,
  dropTarget,
  canEdit,
  onSelect,
  onNameChange,
  onTogglePrimaryKey,
  onToggleImportant,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd
}: FieldListRowProps) {
  const effectiveImportant = field.important || field.primaryKey;
  const handleSelect = useCallback(() => {
    if (canEdit) onSelect(field.id);
  }, [canEdit, field.id, onSelect]);

  const handleRowKeyDown = useCallback(
    (event: KeyboardEvent<HTMLLIElement>) => {
      if (event.key === "Enter" && canEdit && !selected) {
        event.preventDefault();
        onSelect(field.id);
      }
    },
    [canEdit, field.id, onSelect, selected]
  );

  const handleNameChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onNameChange(field.id, event.target.value);
    },
    [field.id, onNameChange]
  );

  const handleInputClick = useCallback((event: MouseEvent<HTMLInputElement>) => {
    event.stopPropagation();
  }, []);

  const handlePrimaryKeyClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      onTogglePrimaryKey(field.id);
    },
    [field.id, onTogglePrimaryKey]
  );

  const handleImportantClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      onToggleImportant(field.id);
    },
    [field.id, onToggleImportant]
  );

  const handleDeleteClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      onDelete(field.id);
    },
    [field.id, onDelete]
  );

  const handleDragStart = useCallback(
    (event: DragEvent<HTMLSpanElement>) => {
      onDragStart(event, field.id);
    },
    [field.id, onDragStart]
  );

  const handleDragOver = useCallback(
    (event: DragEvent<HTMLLIElement>) => {
      onDragOver(event, field.id);
    },
    [field.id, onDragOver]
  );

  const handleDrop = useCallback(
    (event: DragEvent<HTMLLIElement>) => {
      onDrop(event, field.id);
    },
    [field.id, onDrop]
  );

  return (
    <li
      className={`field-list-row grid h-10 grid-cols-[30px_minmax(180px,1fr)_78px_44px_40px] items-center border-b border-slate-100 text-sm transition-colors ${
        selected ? "bg-blue-50" : "hover:bg-slate-50"
      } ${dragging ? "opacity-35" : ""} ${dropTarget ? "field-list-row-drop-target" : ""}`}
      role="row"
      tabIndex={canEdit ? 0 : -1}
      aria-selected={selected}
      onClick={handleSelect}
      onKeyDown={handleRowKeyDown}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <span
        className={`flex h-full items-center justify-center text-slate-300 ${canEdit ? "cursor-grab hover:text-slate-600 active:cursor-grabbing" : "cursor-default"}`}
        draggable={canEdit}
        aria-label={`Drag to reorder ${field.name}`}
        title="Drag to reorder"
        onDragStart={handleDragStart}
        onDragEnd={onDragEnd}
      >
        <GripVertical size={15} />
      </span>

      <div className="min-w-0 pr-3">
        {selected ? (
          <input
            autoFocus
            type="text"
            className="h-7 w-full rounded border border-blue-300 bg-white px-2 font-mono text-[13px] font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            value={field.name}
            aria-label={`Edit ${field.name || "field"} name`}
            onChange={handleNameChange}
            onClick={handleInputClick}
          />
        ) : (
          <span className="block truncate px-2 font-mono text-[13px] font-semibold text-slate-700">{field.name || "Untitled field"}</span>
        )}
      </div>

      <button
        type="button"
        className={`mx-auto flex h-6 min-w-[62px] items-center justify-center rounded-full border px-2 text-[10px] font-extrabold tracking-wide transition-colors ${
          field.primaryKey
            ? "border-violet-300 bg-violet-100 text-violet-800"
            : "border-slate-200 bg-white text-slate-400 hover:border-violet-200 hover:text-violet-600"
        }`}
        disabled={!canEdit}
        aria-label={`Primary key for ${field.name}`}
        aria-pressed={field.primaryKey}
        onClick={handlePrimaryKeyClick}
      >
        PK {field.primaryKey ? "ON" : "OFF"}
      </button>

      <button
        type="button"
        className={`mx-auto flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
          effectiveImportant ? "bg-amber-100 text-amber-600" : "text-slate-300 hover:bg-amber-50 hover:text-amber-500"
        } ${field.primaryKey ? "cursor-not-allowed" : ""}`}
        disabled={!canEdit || field.primaryKey}
        aria-label={
          field.primaryKey
            ? `${field.name} is favorite because it is a primary key`
            : `${field.important ? "Remove" : "Mark"} ${field.name} ${field.important ? "from" : "as"} important`
        }
        aria-pressed={effectiveImportant}
        title={field.primaryKey ? "Primary-key fields are always favorites" : effectiveImportant ? "Important: on" : "Important: off"}
        onClick={handleImportantClick}
      >
        <Star size={16} fill={effectiveImportant ? "currentColor" : "none"} />
      </button>

      <button
        type="button"
        className="mx-auto flex h-7 w-7 items-center justify-center rounded-md text-slate-300 transition-colors hover:bg-red-50 hover:text-red-600 disabled:hover:bg-transparent disabled:hover:text-slate-300"
        disabled={!canEdit}
        aria-label={`Delete ${field.name}`}
        title="Delete field"
        onClick={handleDeleteClick}
      >
        <Trash2 size={15} />
      </button>
    </li>
  );
}
