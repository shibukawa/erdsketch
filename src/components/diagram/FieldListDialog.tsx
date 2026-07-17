import { ListTree, Star, TableProperties, X } from "lucide-react";
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
import { reorderFields } from "../../features/modeling/fieldOrder";
import type { DataDomain, DomainCategory, ModelField, ModelSeed, NameDisplayMode, NameSet, RefinementResult, Relationship, RelationshipReference } from "../../features/modeling/types";
import { getDisplayName, sortFieldListItems, updateNameSet } from "../../features/modeling/utils";
import { FieldListRow } from "./FieldListRow";
import { RelationshipReferenceRow } from "./RelationshipReferenceRow";
import { DomainDictionaryPanel } from "./DomainDictionaryPanel";
import { RefinementPanel } from "./RefinementPanel";
import { NameModeControl } from "./NameModeControl";
import type { VocabularyMatchCache } from "../../features/modeling/vocabulary";
import { VocabularyDisplayName } from "./VocabularyDisplayName";
import { VocabularyNavigationProvider, useVocabularyNavigation } from "./VocabularyNavigationContext";
import { FieldDefinitionPanel } from "./FieldDefinitionPanel";
import { IndexDefinitionDialog } from "./IndexDefinitionDialog";
import { PartitionDefinitionDialog } from "./PartitionDefinitionDialog";
import { GuidedTourButton } from "../guidedTour/GuidedTourButton";
import { GuidedTourTrigger } from "../guidedTour/GuidedTourTrigger";

type FieldListDialogProps = {
  modelId: string;
  modelTitle: string;
  modelNames?: NameSet;
  initialNameDisplayMode: NameDisplayMode;
  vocabularyCache: VocabularyMatchCache;
  modelMaturedLevel: number;
  fields: ModelField[];
  domains: DataDomain[];
  domainCategories: DomainCategory[];
  relationshipReferences: Array<{ relationship: Relationship; reference: RelationshipReference }>;
  seeds: ModelSeed[];
  allRelationships: Relationship[];
  allRelationshipReferences: RelationshipReference[];
  canEdit: boolean;
  onChange: (fields: ModelField[]) => void;
  onModelChange: (patch: Partial<ModelSeed>) => void;
  onClose: () => void;
  onUpdateReference: (relationshipId: string, patch: Partial<RelationshipReference>) => void;
  onDeleteReference: (relationshipId: string) => void;
  onCreateDomain: (name: string) => void;
  onOpenDomainDictionary: (fieldId?: string) => void;
  onApplyRefinement: (result: RefinementResult) => Promise<boolean>;
};

function replaceField(fields: ModelField[], fieldId: string, patch: Partial<ModelField>) {
  return fields.map((field) => (field.id === fieldId ? { ...field, ...patch } : field));
}

export function FieldListDialog({ modelId, modelTitle, modelNames, initialNameDisplayMode, vocabularyCache, modelMaturedLevel, fields, domains, domainCategories, relationshipReferences, seeds, allRelationships, allRelationshipReferences, canEdit, onChange, onModelChange, onClose, onUpdateReference, onDeleteReference, onCreateDomain, onOpenDomainDictionary, onApplyRefinement }: FieldListDialogProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const quickEntryRef = useRef<HTMLInputElement | null>(null);
  const fieldsRef = useRef(fields);
  const openVocabulary = useVocabularyNavigation();
  const [quickEntry, setQuickEntry] = useState("");
  const [autoFavorite, setAutoFavorite] = useState(modelMaturedLevel === 6);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [draggingFieldId, setDraggingFieldId] = useState<string | null>(null);
  const [dropTargetFieldId, setDropTargetFieldId] = useState<string | null>(null);
  const [domainDropTargetFieldId, setDomainDropTargetFieldId] = useState<string | null>(null);
  const [quickEntryDomainDropTarget, setQuickEntryDomainDropTarget] = useState(false);
  const [selectedRefinementFieldIds, setSelectedRefinementFieldIds] = useState<string[]>([]);
  const [selectedRefinementRelationshipIds, setSelectedRefinementRelationshipIds] = useState<string[]>([]);
  const [sideTab, setSideTab] = useState<"definition" | "domains" | "refinement">("domains");
  const [advancedDialog, setAdvancedDialog] = useState<"indexes" | "partition" | null>(null);
  const [nameDisplayMode, setNameDisplayMode] = useState(initialNameDisplayMode);

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
    setSideTab("definition");
  }, []);
  const handleFieldDefinitionChange = useCallback((fieldId: string, patch: Partial<ModelField>) => {
    commitFields(replaceField(fieldsRef.current, fieldId, patch));
  }, [commitFields]);
  const handleToggleRefinement = useCallback((fieldId: string) => {
    const selecting = !selectedRefinementFieldIds.includes(fieldId);
    setSelectedRefinementFieldIds((current) => selecting ? [...current, fieldId] : current.filter((id) => id !== fieldId));
    if (selecting) setSideTab("refinement");
  }, [selectedRefinementFieldIds]);
  const handleToggleRelationshipRefinement = useCallback((relationshipId: string) => {
    setSelectedRefinementRelationshipIds((current) => current.includes(relationshipId) ? current.filter((id) => id !== relationshipId) : [...current, relationshipId]);
  }, []);
  const handleDomainsTab = useCallback(() => {
    setSideTab("domains");
  }, []);
  const handleDefinitionTab = useCallback(() => {
    setSideTab("definition");
  }, []);
  const handleRefinementTab = useCallback(() => {
    setSideTab("refinement");
  }, []);
  const handleApplyRefinement = useCallback(async (result: RefinementResult) => {
    const applied = await onApplyRefinement(result);
    if (applied) onClose();
    return applied;
  }, [onApplyRefinement, onClose]);
  const handleOpenVocabulary = useCallback((matchKey: string) => {
    onClose();
    openVocabulary?.(matchKey);
  }, [onClose, openVocabulary]);

  const handleFieldNameChange = useCallback(
    (fieldId: string, name: string) => {
      const field = fieldsRef.current.find((candidate) => candidate.id === fieldId);
      if (!field || (!name && !(field.domainId && field.useDomainName))) return;
      commitFields(replaceField(fieldsRef.current, fieldId, { names: updateNameSet(field.name, field.names, "business", name), vocabularyBinding: undefined }));
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
            important: field.primaryKey ? field.important : true,
            required: field.primaryKey ? field.required : true,
            unique: field.primaryKey ? field.unique : false,
            valueGeneration: field.primaryKey ? undefined : field.valueGeneration
          })
        );
      }
    },
    [commitFields]
  );

  const handleOpenAdvanced = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    setAdvancedDialog(event.currentTarget.dataset.dialog as "indexes" | "partition");
  }, []);
  const handleCloseAdvanced = useCallback(() => { setAdvancedDialog(null); }, []);
  const handleSaveIndexes = useCallback((indexes: ModelSeed["indexes"]) => { onModelChange({ indexes }); setAdvancedDialog(null); }, [onModelChange]);
  const handleSavePartitioning = useCallback((partitioning: ModelSeed["partitioning"]) => { onModelChange({ partitioning }); setAdvancedDialog(null); }, [onModelChange]);

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
      const bounds = event.currentTarget.getBoundingClientRect();
      const insertAfter = event.clientY >= bounds.top + bounds.height / 2;
      if (sourceId) commitFields(reorderFields(fieldsRef.current, sourceId, targetId, insertAfter));
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
    <VocabularyNavigationProvider onOpen={handleOpenVocabulary}><dialog
      data-tour="field-dialog"
      ref={dialogRef}
      className="field-list-dialog m-auto h-[min(90vh,860px)] w-[min(98vw,1460px)] overflow-hidden rounded-xl border border-slate-200 bg-white p-0 text-slate-950 shadow-2xl"
      aria-labelledby="field-list-title"
      onCancel={handleCancel}
      onClose={onClose}
      onClick={handleBackdropClick}
      onPointerDown={handleDialogPointerDown}
      onWheel={handleDialogWheel}
    >
      <div data-guided-tour-portal="fields" />
      <GuidedTourTrigger tour="fields" />
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <header className="shrink-0 border-b border-slate-200 px-5 py-4">
          <div className="flex items-start justify-between gap-5">
            <div className="flex min-w-0 items-baseline gap-3">
              <h2 id="field-list-title" className="text-xl font-bold">Fields</h2>
              <p className="truncate text-xs font-bold uppercase tracking-[0.14em] text-blue-600"><VocabularyDisplayName cache={vocabularyCache} cacheKey={`table:${modelId}`} legacyName={modelTitle} names={modelNames} mode={nameDisplayMode} /></p>
              <span className="text-xs font-semibold text-slate-400">{fields.length + relationshipReferences.length} items</span>
            </div>
            <div className="flex items-center gap-1"><GuidedTourButton tour="fields" label="Fields" compact /><button type="button" className="btn btn-ghost btn-sm btn-square -mr-1 -mt-1" aria-label="Close field list" onClick={onClose}>
              <X size={18} />
            </button></div>
          </div>

          <div className="mt-3 w-72"><NameModeControl value={nameDisplayMode} onChange={setNameDisplayMode} compact /></div>

          <div className="mt-3 flex items-center gap-3">
            <label
              data-tour="field-quick-entry"
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
          <div className="mt-3 flex flex-wrap gap-2"><button type="button" data-dialog="indexes" className="btn btn-outline btn-sm" onClick={handleOpenAdvanced}><ListTree size={15}/>Indexes</button><button type="button" data-dialog="partition" className="btn btn-outline btn-sm" onClick={handleOpenAdvanced}><TableProperties size={15}/>Range partition</button></div>

          {!canEdit && (
            <p className="mt-2 rounded-md bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900">
              This model is read-only. Lock its card to edit fields.
            </p>
          )}
        </header>

        <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="field-list-scroll min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-3">
          <div
            className="sticky top-0 z-10 grid h-8 grid-cols-[40px_minmax(140px,1fr)_120px_78px_70px_56px_44px_40px] items-center border-b border-slate-200 bg-white/95 text-[10px] font-bold uppercase tracking-wider text-slate-400 backdrop-blur"
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
                  return <FieldListRow key={field.id} field={field} modelId={modelId} nameDisplayMode={nameDisplayMode} vocabularyCache={vocabularyCache} domain={domains.find((domain) => domain.id === field.domainId)} domains={domains} selected={editingFieldId === field.id && canEdit && nameDisplayMode === "business"} refinementSelected={selectedRefinementFieldIds.includes(field.id)} dragging={draggingFieldId === field.id} dropTarget={dropTargetFieldId === field.id && draggingFieldId !== field.id} domainDropTarget={domainDropTargetFieldId === field.id} canEdit={canEdit} onSelect={handleSelectField} onToggleRefinement={handleToggleRefinement} onNameChange={handleFieldNameChange} onTogglePrimaryKey={handleTogglePrimaryKey} onToggleImportant={handleToggleImportant} onToggleUseDomainName={handleToggleUseDomainName} onDelete={handleDelete} onDragStart={handleDragStart} onDragOver={handleDragOver} onDrop={handleDrop} onDragEnd={clearDragState} onDomainDrop={handleDomainAssign} />;
                }
                const referenceItem = relationshipReferenceByID.get(item.item.id);
                return referenceItem ? <RelationshipReferenceRow key={item.item.id} modelId={modelId} relationship={referenceItem.relationship} reference={referenceItem.reference} canEdit={canEdit} refinementSelected={selectedRefinementRelationshipIds.includes(referenceItem.relationship.id)} onToggleRefinement={handleToggleRelationshipRefinement} onTogglePrimaryKey={handleToggleReferencePrimaryKey} onToggleForeignKey={handleToggleReferenceForeignKey} onToggleVisibility={handleToggleReferenceVisibility} onDelete={onDeleteReference} /> : null;
              })}
            </ul>
          )}
        </div>
        <aside className="flex min-h-0 w-[370px] shrink-0 flex-col overflow-hidden border-l border-slate-200 bg-slate-50"><div role="tablist" className="tabs tabs-lift tabs-sm mx-3 mt-3 shrink-0 flex-nowrap whitespace-nowrap bg-slate-100"><button type="button" role="tab" aria-selected={sideTab === "definition"} className={`tab min-w-0 flex-1 text-xs ${sideTab === "definition" ? "tab-active bg-white" : "bg-slate-100"}`} onClick={handleDefinitionTab}>Definition</button><button type="button" role="tab" aria-selected={sideTab === "domains"} className={`tab min-w-0 flex-1 text-xs ${sideTab === "domains" ? "tab-active bg-white" : "bg-slate-100"}`} onClick={handleDomainsTab}>Domains</button><button type="button" role="tab" aria-selected={sideTab === "refinement"} className={`tab min-w-0 flex-1 text-xs ${sideTab === "refinement" ? "tab-active bg-white" : "bg-slate-100"}`} onClick={handleRefinementTab}>Refinement</button></div><div className="flex min-h-0 flex-1 overflow-hidden">{sideTab === "definition" ? <FieldDefinitionPanel field={fields.find((field) => field.id === editingFieldId)} domains={domains} canEdit={canEdit} onChange={handleFieldDefinitionChange}/> : sideTab === "domains" ? <DomainDictionaryPanel domains={domains} categories={domainCategories} nameDisplayMode={nameDisplayMode} vocabularyCache={vocabularyCache} canEdit={canEdit} onCreate={onCreateDomain} onOpen={() => onOpenDomainDictionary(editingFieldId ?? undefined)} /> : <RefinementPanel source={seeds.find((seed) => seed.id === modelId)!} seeds={seeds} relationships={allRelationships} relationshipReferences={allRelationshipReferences} domains={domains} selectedFieldIds={selectedRefinementFieldIds} selectedRelationshipIds={selectedRefinementRelationshipIds} canEdit={canEdit} onApply={handleApplyRefinement}/>}</div></aside>
        </div>
      </div>
      {advancedDialog === "indexes" && <IndexDefinitionDialog fields={fields} domains={domains} relationshipReferences={relationshipReferences} initial={seeds.find((seed) => seed.id === modelId)?.indexes ?? []} canEdit={canEdit} onSave={handleSaveIndexes} onClose={handleCloseAdvanced}/>}
      {advancedDialog === "partition" && <PartitionDefinitionDialog fields={fields} domains={domains} initial={seeds.find((seed) => seed.id === modelId)?.partitioning} canEdit={canEdit} onSave={handleSavePartitioning} onClose={handleCloseAdvanced}/>}
    </dialog></VocabularyNavigationProvider>,
    document.body
  );
}
