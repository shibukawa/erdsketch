import { Star, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type SyntheticEvent,
  type WheelEvent
} from "react";
import { createPortal } from "react-dom";
import type { DataDomain, DomainCategory, ModelField, Relationship, RelationshipReference } from "../../features/modeling/types";
import { sortFieldListItems } from "../../features/modeling/utils";
import { FieldListRow } from "./FieldListRow";
import { RelationshipReferenceRow } from "./RelationshipReferenceRow";
import { DomainDictionaryPanel } from "./DomainDictionaryPanel";

type FieldListDialogProps = {
  modelId: string;
  modelTitle: string;
  modelMaturedLevel: number;
  fields: ModelField[];
  domains: DataDomain[];
  domainCategories: DomainCategory[];
  relationshipReferences: Array<{ relationship: Relationship; reference: RelationshipReference }>;
  canEdit: boolean;
  onChange: (fields: ModelField[]) => void;
  onClose: () => void;
  onUpdateReference: (relationshipId: string, patch: Partial<RelationshipReference>) => void;
  onDeleteReference: (relationshipId: string) => void;
  onCreateDomain: (name: string) => void;
  onOpenDomainDictionary: (fieldId?: string) => void;
};

function replaceField(fields: ModelField[], fieldId: string, patch: Partial<ModelField>) {
  return fields.map((field) => (field.id === fieldId ? { ...field, ...patch } : field));
}

function reorderFields(fields: ModelField[], sourceId: string, targetId: string) {
  if (sourceId === targetId) return fields;
  const source = fields.find((field) => field.id === sourceId);
  if (!source) return fields;
  const remaining = fields.filter((field) => field.id !== sourceId);
  const targetIndex = remaining.findIndex((field) => field.id === targetId);
  if (targetIndex < 0) return fields;
  return [...remaining.slice(0, targetIndex), source, ...remaining.slice(targetIndex)];
}

export function FieldListDialog({ modelId, modelTitle, modelMaturedLevel, fields, domains, domainCategories, relationshipReferences, canEdit, onChange, onClose, onUpdateReference, onDeleteReference, onCreateDomain, onOpenDomainDictionary }: FieldListDialogProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const quickEntryRef = useRef<HTMLInputElement | null>(null);
  const fieldsRef = useRef(fields);
  const [quickEntry, setQuickEntry] = useState("");
  const [autoFavorite, setAutoFavorite] = useState(modelMaturedLevel === 6);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [draggingFieldId, setDraggingFieldId] = useState<string | null>(null);
  const [dropTargetFieldId, setDropTargetFieldId] = useState<string | null>(null);
  const [domainDropTargetFieldId, setDomainDropTargetFieldId] = useState<string | null>(null);
  const [quickEntryDomainDropTarget, setQuickEntryDomainDropTarget] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  useEffect(() => {
    if (canEdit) quickEntryRef.current?.focus();
  }, [canEdit]);

  useEffect(() => {
    fieldsRef.current = fields;
  }, [fields]);

  const commitFields = useCallback(
    (nextFields: ModelField[]) => {
      fieldsRef.current = nextFields;
      onChange(nextFields);
    },
    [onChange]
  );

  const handleDialogPointerDown = useCallback((event: PointerEvent<HTMLDialogElement>) => {
    event.stopPropagation();
  }, []);

  const handleDialogWheel = useCallback((event: WheelEvent<HTMLDialogElement>) => {
    event.stopPropagation();
  }, []);

  const handleBackdropClick = useCallback(
    (event: MouseEvent<HTMLDialogElement>) => {
      if (event.target === event.currentTarget) onClose();
    },
    [onClose]
  );

  const handleCancel = useCallback(
    (event: SyntheticEvent<HTMLDialogElement>) => {
      event.preventDefault();
      onClose();
    },
    [onClose]
  );

  const handleQuickEntryChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setQuickEntry(event.target.value);
  }, []);

  const handleAutoFavoriteClick = useCallback(() => {
    setAutoFavorite((current) => !current);
  }, []);

  const handleQuickEntryKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key !== "Enter" || event.nativeEvent.isComposing || event.keyCode === 229) return;
      event.preventDefault();
      const name = quickEntry.trim();
      if (!canEdit || !name) return;
      const field: ModelField = {
        id: crypto.randomUUID(),
        name,
        primaryKey: false,
        important: autoFavorite
      };
      commitFields([...fieldsRef.current, field]);
      setQuickEntry("");
      setEditingFieldId(null);
    },
    [autoFavorite, canEdit, commitFields, quickEntry]
  );

  const handleQuickEntryDragOver = useCallback((event: DragEvent<HTMLLabelElement>) => {
    if (!canEdit || !event.dataTransfer.types.includes("application/x-erdsketch-domain-id")) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "copy";
    setQuickEntryDomainDropTarget(true);
  }, [canEdit]);

  const handleQuickEntryDragLeave = useCallback((event: DragEvent<HTMLLabelElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setQuickEntryDomainDropTarget(false);
  }, []);

  const handleQuickEntryDomainDrop = useCallback((event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setQuickEntryDomainDropTarget(false);
    const domainId = event.dataTransfer.getData("application/x-erdsketch-domain-id");
    if (!canEdit || !domains.some((domain) => domain.id === domainId)) return;
    const field: ModelField = {
      id: crypto.randomUUID(),
      name: quickEntry.trim(),
      primaryKey: false,
      important: autoFavorite,
      domainId,
      useDomainName: true
    };
    commitFields([...fieldsRef.current, field]);
    setQuickEntry("");
    setEditingFieldId(field.id);
  }, [autoFavorite, canEdit, commitFields, domains, quickEntry]);

  const handleSelectField = useCallback((fieldId: string) => {
    setEditingFieldId(fieldId);
  }, []);

  const handleFieldNameChange = useCallback(
    (fieldId: string, name: string) => {
      const field = fieldsRef.current.find((candidate) => candidate.id === fieldId);
      if (!field || (!name && !(field.domainId && field.useDomainName))) return;
      commitFields(replaceField(fieldsRef.current, fieldId, { name }));
    },
    [commitFields]
  );

  const handleTogglePrimaryKey = useCallback(
    (fieldId: string) => {
      const field = fieldsRef.current.find((candidate) => candidate.id === fieldId);
      if (field) {
        commitFields(
          replaceField(fieldsRef.current, fieldId, {
            primaryKey: !field.primaryKey,
            important: field.primaryKey ? field.important : true
          })
        );
      }
    },
    [commitFields]
  );

  const handleToggleImportant = useCallback(
    (fieldId: string) => {
      const field = fieldsRef.current.find((candidate) => candidate.id === fieldId);
      if (field && !field.primaryKey) commitFields(replaceField(fieldsRef.current, fieldId, { important: !field.important }));
    },
    [commitFields]
  );

  const handleToggleUseDomainName = useCallback((fieldId: string) => {
    const field = fieldsRef.current.find((candidate) => candidate.id === fieldId);
    if (field?.domainId && (field.useDomainName ? !!field.name : true)) commitFields(replaceField(fieldsRef.current, fieldId, { useDomainName: !field.useDomainName }));
  }, [commitFields]);

  const handleDelete = useCallback(
    (fieldId: string) => {
      commitFields(fieldsRef.current.filter((field) => field.id !== fieldId));
      setEditingFieldId((current) => (current === fieldId ? null : current));
    },
    [commitFields]
  );

  const handleDragStart = useCallback((event: DragEvent<HTMLElement>, fieldId: string) => {
    event.stopPropagation();
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", fieldId);
    setDraggingFieldId(fieldId);
  }, []);

  const handleDragOver = useCallback((event: DragEvent<HTMLElement>, fieldId: string) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer.types.includes("application/x-erdsketch-domain-id")) {
      event.dataTransfer.dropEffect = "copy";
      setDropTargetFieldId(null);
      setDomainDropTargetFieldId(fieldId);
    } else {
      event.dataTransfer.dropEffect = "move";
      setDomainDropTargetFieldId(null);
      setDropTargetFieldId(fieldId);
    }
  }, []);

  const clearDragState = useCallback(() => {
    setDraggingFieldId(null);
    setDropTargetFieldId(null);
    setDomainDropTargetFieldId(null);
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLElement>, targetId: string) => {
      event.preventDefault();
      event.stopPropagation();
      const sourceId = draggingFieldId ?? event.dataTransfer.getData("text/plain");
      if (sourceId) commitFields(reorderFields(fieldsRef.current, sourceId, targetId));
      clearDragState();
    },
    [clearDragState, commitFields, draggingFieldId]
  );

  const handleDomainAssign = useCallback(
    (fieldId: string, domainId: string) => {
      if (!canEdit || !domains.some((domain) => domain.id === domainId)) return;
      commitFields(replaceField(fieldsRef.current, fieldId, { domainId }));
      clearDragState();
    },
    [canEdit, clearDragState, commitFields, domains]
  );

  const relationshipReferenceByID = new Map(relationshipReferences.map((item) => [item.reference.id, item]));
  const sortedItems = sortFieldListItems(fields, relationshipReferences.map((item) => item.reference));
  const handleToggleReferencePrimaryKey = useCallback((relationshipId: string) => {
    const item = relationshipReferences.find((candidate) => candidate.relationship.id === relationshipId);
    if (item) onUpdateReference(relationshipId, { primaryKey: !item.reference.primaryKey });
  }, [onUpdateReference, relationshipReferences]);
  const handleToggleReferenceForeignKey = useCallback((relationshipId: string) => {
    const item = relationshipReferences.find((candidate) => candidate.relationship.id === relationshipId);
    if (item) onUpdateReference(relationshipId, { foreignKey: !item.reference.foreignKey });
  }, [onUpdateReference, relationshipReferences]);
  const handleToggleReferenceVisibility = useCallback((relationshipId: string) => {
    const item = relationshipReferences.find((candidate) => candidate.relationship.id === relationshipId);
    if (!item) return;
    const hidden = item.reference.hiddenOnModelIds ?? [];
    onUpdateReference(relationshipId, {
      hiddenOnModelIds: hidden.includes(modelId) ? hidden.filter((id) => id !== modelId) : [...hidden, modelId]
    });
  }, [modelId, onUpdateReference, relationshipReferences]);

  return createPortal(
    <dialog
      ref={dialogRef}
      className="field-list-dialog m-auto h-[min(90vh,860px)] w-[min(98vw,1380px)] rounded-xl border border-slate-200 bg-white p-0 text-slate-950 shadow-2xl"
      aria-labelledby="field-list-title"
      onCancel={handleCancel}
      onClose={onClose}
      onClick={handleBackdropClick}
      onPointerDown={handleDialogPointerDown}
      onWheel={handleDialogWheel}
    >
      <div className="flex h-full min-h-0 flex-col">
        <header className="shrink-0 border-b border-slate-200 px-5 py-4">
          <div className="flex items-start justify-between gap-5">
            <div className="flex min-w-0 items-baseline gap-3">
              <h2 id="field-list-title" className="text-xl font-bold">Fields</h2>
              <p className="truncate text-xs font-bold uppercase tracking-[0.14em] text-blue-600">{modelTitle}</p>
              <span className="text-xs font-semibold text-slate-400">{fields.length + relationshipReferences.length} items</span>
            </div>
            <button type="button" className="btn btn-ghost btn-sm btn-square -mr-1 -mt-1" aria-label="Close field list" onClick={onClose}>
              <X size={18} />
            </button>
          </div>

          <div className="mt-3 flex items-center gap-3">
            <label
              className={`input input-bordered intent-add flex h-10 min-w-0 flex-1 items-center gap-2 rounded-lg ${quickEntryDomainDropTarget ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200" : ""}`}
              onDragOver={handleQuickEntryDragOver}
              onDragLeave={handleQuickEntryDragLeave}
              onDrop={handleQuickEntryDomainDrop}
            >
              <span className="text-base font-light text-slate-400">＋</span>
              <input
                ref={quickEntryRef}
                type="text"
                className="grow"
                value={quickEntry}
                disabled={!canEdit}
                placeholder="Type a field name and press Enter or drop Domain,"
                aria-label="New field name"
                onChange={handleQuickEntryChange}
                onKeyDown={handleQuickEntryKeyDown}
              />
              <kbd className="kbd kbd-sm bg-white text-slate-500">Enter</kbd>
            </label>
            <div
              className="flex h-10 shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3"
              title={`Initial value follows maturity: ${modelMaturedLevel === 6 ? "ON" : "OFF"} at ${modelMaturedLevel}`}
            >
              <span className="text-xs font-bold text-slate-600">Auto Fav</span>
              <button
                type="button"
                className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
                  autoFavorite ? "bg-amber-100 text-amber-600" : "text-slate-300 hover:bg-amber-50 hover:text-amber-500"
                }`}
                disabled={!canEdit}
                aria-label="Automatically mark new fields as favorites"
                aria-pressed={autoFavorite}
                title={autoFavorite ? "Auto Fav: on" : "Auto Fav: off"}
                onClick={handleAutoFavoriteClick}
              >
                <Star size={16} fill={autoFavorite ? "currentColor" : "none"} />
              </button>
            </div>
            <p className="hidden shrink-0 text-xs text-slate-500 lg:block">Drag to reorder · Important affects display only</p>
          </div>

          {!canEdit && (
            <p className="mt-2 rounded-md bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900">
              This model is read-only. Lock its card to edit fields.
            </p>
          )}
        </header>

        <div className="flex min-h-0 flex-1">
        <div className="field-list-scroll min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-3">
          <div
            className="sticky top-0 z-10 grid h-8 grid-cols-[30px_minmax(140px,1fr)_120px_78px_70px_56px_44px_40px] items-center border-b border-slate-200 bg-white/95 text-[10px] font-bold uppercase tracking-wider text-slate-400 backdrop-blur"
            role="row"
          >
            <span aria-hidden="true" />
            <span className="px-2">Field name</span>
            <span className="px-2">Domain</span>
            <span className="text-center">Primary key</span>
            <span className="text-center">Foreign key</span>
            <span className="text-center">Canvas</span>
            <span className="text-center">Fav</span>
            <span className="text-center">Delete</span>
          </div>

          {fields.length === 0 && relationshipReferences.length === 0 ? (
            <div className="px-5 py-16 text-center text-sm text-slate-500">No fields yet. Type a name above to add the first one.</div>
          ) : (
            <ul role="rowgroup" aria-label="Model fields">
              {sortedItems.map((item) => {
                if (item.type === "field") {
                  const field = item.item;
                  return <FieldListRow key={field.id} field={field} domain={domains.find((domain) => domain.id === field.domainId)} domains={domains} selected={editingFieldId === field.id && canEdit} dragging={draggingFieldId === field.id} dropTarget={dropTargetFieldId === field.id && draggingFieldId !== field.id} domainDropTarget={domainDropTargetFieldId === field.id} canEdit={canEdit} onSelect={handleSelectField} onNameChange={handleFieldNameChange} onTogglePrimaryKey={handleTogglePrimaryKey} onToggleImportant={handleToggleImportant} onToggleUseDomainName={handleToggleUseDomainName} onDelete={handleDelete} onDragStart={handleDragStart} onDragOver={handleDragOver} onDrop={handleDrop} onDragEnd={clearDragState} onDomainDrop={handleDomainAssign} />;
                }
                const referenceItem = relationshipReferenceByID.get(item.item.id);
                return referenceItem ? <RelationshipReferenceRow key={item.item.id} modelId={modelId} relationship={referenceItem.relationship} reference={referenceItem.reference} canEdit={canEdit} onTogglePrimaryKey={handleToggleReferencePrimaryKey} onToggleForeignKey={handleToggleReferenceForeignKey} onToggleVisibility={handleToggleReferenceVisibility} onDelete={onDeleteReference} /> : null;
              })}
            </ul>
          )}
        </div>
        <DomainDictionaryPanel domains={domains} categories={domainCategories} canEdit={canEdit} onCreate={onCreateDomain} onOpen={() => onOpenDomainDictionary(editingFieldId ?? undefined)} />
        </div>
      </div>
    </dialog>,
    document.body
  );
}
