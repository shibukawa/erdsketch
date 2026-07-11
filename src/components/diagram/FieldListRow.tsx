import { Columns3, GripVertical, Star, Trash2 } from "lucide-react";
import {
  useCallback,
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
  type MouseEvent
} from "react";
import type { DataDomain, ModelField } from "../../features/modeling/types";
import { expandDomainField, getFieldEffectiveName, isPartitionKeyField } from "../../features/modeling/utils";

type FieldListRowProps = {
  field: ModelField;
  selected: boolean;
  dragging: boolean;
  dropTarget: boolean;
  domainDropTarget: boolean;
  canEdit: boolean;
  domain?: DataDomain;
  domains: DataDomain[];
  onSelect: (fieldId: string) => void;
  onNameChange: (fieldId: string, name: string) => void;
  onTogglePrimaryKey: (fieldId: string) => void;
  onToggleImportant: (fieldId: string) => void;
  onToggleUseDomainName: (fieldId: string) => void;
  onDelete: (fieldId: string) => void;
  onDragStart: (event: DragEvent<HTMLElement>, fieldId: string) => void;
  onDragOver: (event: DragEvent<HTMLElement>, fieldId: string) => void;
  onDrop: (event: DragEvent<HTMLElement>, fieldId: string) => void;
  onDragEnd: () => void;
  onDomainDrop: (fieldId: string, domainId: string) => void;
};

export function FieldListRow({
  field,
  selected,
  dragging,
  dropTarget,
  domainDropTarget,
  canEdit,
  domain,
  domains,
  onSelect,
  onNameChange,
  onTogglePrimaryKey,
  onToggleImportant,
  onToggleUseDomainName,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onDomainDrop
}: FieldListRowProps) {
  const effectiveImportant = field.important || field.primaryKey;
  const expandedNames = expandDomainField(field, domains).map((item) => item.name);
  const effectiveName = getFieldEffectiveName(field, domains);
  const partitionKey = isPartitionKeyField(field, domains);
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

  const handleInputClick = useCallback((event: MouseEvent<HTMLElement>) => {
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

  const handleUseDomainNameChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    event.stopPropagation();
    onToggleUseDomainName(field.id);
  }, [field.id, onToggleUseDomainName]);

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
      const domainId = event.dataTransfer.getData("application/x-erdsketch-domain-id");
      if (domainId) {
        event.preventDefault();
        event.stopPropagation();
        onDomainDrop(field.id, domainId);
        return;
      }
      onDrop(event, field.id);
    },
    [field.id, onDomainDrop, onDrop]
  );

  return (
    <li
      className={`field-list-row grid h-10 grid-cols-[30px_minmax(140px,1fr)_120px_78px_70px_44px_40px] items-center border-b border-slate-100 text-sm transition-colors ${
        partitionKey ? "bg-cyan-50 hover:bg-cyan-100" : selected ? "bg-blue-50" : "hover:bg-slate-50"
      } ${dragging ? "opacity-35" : ""} ${dropTarget ? "field-list-row-drop-target" : ""} ${domainDropTarget ? "bg-blue-100 ring-2 ring-inset ring-blue-400" : ""}`}
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
          <div className="flex min-w-0 items-center gap-2">
            <input
              autoFocus
              type="text"
              className="h-7 min-w-0 flex-1 rounded border border-blue-300 bg-white px-2 font-mono text-[13px] font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              value={field.name}
              aria-label={`Edit ${effectiveName || "field"} name`}
              onChange={handleNameChange}
              onClick={handleInputClick}
            />
            {domain && <label className="flex w-[118px] shrink-0 grow-0 cursor-pointer items-center justify-end gap-1.5 whitespace-nowrap text-[10px] font-semibold text-slate-600" onClick={handleInputClick}><input type="checkbox" className="checkbox checkbox-xs" checked={field.useDomainName ?? false} onChange={handleUseDomainNameChange} disabled={!canEdit} />Use domain name</label>}
          </div>
        ) : (
          <span className="flex truncate px-2 font-mono text-[13px] font-semibold text-slate-700">{partitionKey && <Columns3 size={14} className="mr-1.5 shrink-0 text-cyan-700" aria-label="Partition key" />}{effectiveName || "Untitled field"}</span>
        )}
      </div>

      <span className={`truncate rounded px-2 py-1 font-mono text-[10px] font-semibold ${domainDropTarget ? "bg-blue-600 text-white ring-2 ring-blue-300" : "bg-slate-100 text-slate-600"}`} title={domain ? `Domain: ${domain.name}${domain.shape === "composite" ? `\nExpands to: ${expandedNames.join(", ")}` : ""}` : "No domain assigned"}>
        {domain?.shape === "composite" ? `${domain.name} · ${expandedNames.length}` : domain?.name ?? "—"}
      </span>

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

      <span className="text-center text-[10px] font-bold text-slate-300">—</span>

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
