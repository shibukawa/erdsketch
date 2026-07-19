import { Columns3, Database, KeyRound, Link2, Lock, Menu, Pencil, Star } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FocusEvent, type KeyboardEvent, type PointerEvent } from "react";
import type { Collaborator } from "../../collaboration";
import { cardHeight, dependencyLabels, roleMeta } from "../../features/modeling/constants";
import type { CanvasAccessMode, CardDisplayMode, DataDomain, DomainCategory, ModelField, ModelSeed, NameDisplayMode, RefinementResult, Relationship, RelationshipReference } from "../../features/modeling/types";
import { expandDomainField, flattenLabels, getDomainPhysicalTypeLabel, getFieldEffectiveName, getModelStageLabel, relationshipDisplaySeedIDs, updateNameSet } from "../../features/modeling/utils";
import { FieldListDialog } from "./FieldListDialog";
import { ModelEditDialog } from "./ModelEditDialog";
import { RoughShape } from "./RoughShape";
import type { VocabularyMatchCache } from "../../features/modeling/vocabulary";
import { VocabularyDisplayName } from "./VocabularyDisplayName";
import { useI18n } from "../../i18n/I18nProvider";
import { translateText } from "../../i18n/translations";

type ModelSeedCardProps = {
  seed: ModelSeed;
  width: number;
  descriptionHeight: number;
  selected: boolean;
  relationshipDropTarget: boolean;
  displayMode: CardDisplayMode;
  nameDisplayMode: NameDisplayMode;
  vocabularyCache: VocabularyMatchCache;
  owner?: Collaborator;
  me: Collaborator;
  accessMode: CanvasAccessMode;
  onPointerDown: (event: PointerEvent<HTMLElement>, seed: ModelSeed) => void;
  onUpdate: (seedId: string, patch: Partial<ModelSeed>) => void;
  onEditingChange: (seedId: string, editing: boolean) => void;
  remoteEditor?: Collaborator;
  onUnlock: (seedId: string) => void;
  onRelationshipPointerDown: (event: PointerEvent<HTMLButtonElement>, seed: ModelSeed) => void;
  relationships: Relationship[];
  relationshipReferences: RelationshipReference[];
  domains: DataDomain[];
  domainCategories: DomainCategory[];
  onUpdateRelationshipReference: (relationshipId: string, patch: Partial<RelationshipReference>) => void;
  onDeleteRelationship: (relationshipId: string) => void;
  onCreateDomain: (name: string) => void;
  onOpenDomainDictionary: (seedId: string, fieldId?: string) => void;
  seeds: ModelSeed[];
  onApplyRefinement: (result: RefinementResult, targetCanvasId?: string) => Promise<boolean>;
};

function FieldDomainDisplay({ domainId, nameDisplayMode, domains, vocabularyCache }: { domainId?: string; nameDisplayMode: NameDisplayMode; domains: DataDomain[]; vocabularyCache: VocabularyMatchCache }) {
  if (nameDisplayMode === "physical") {
    const physicalType = getDomainPhysicalTypeLabel(domainId, domains);
    return physicalType
      ? <code data-i18n-skip className="truncate text-[10px] font-semibold text-slate-500" title={physicalType}>{physicalType}</code>
      : <span className="truncate text-[10px] font-semibold text-orange-700 underline decoration-wavy decoration-orange-500" title="The physical data type could not be resolved.">Type unresolved</span>;
  }
  const domain = domains.find((candidate) => candidate.id === domainId);
  return domain
    ? <span className="truncate text-[10px] font-semibold text-slate-500"><VocabularyDisplayName cache={vocabularyCache} cacheKey={`domain:${domain.id}`} legacyName={domain.name} names={domain.names} mode={nameDisplayMode} /></span>
    : <span className="truncate text-[10px] font-semibold text-orange-700 underline decoration-wavy decoration-orange-500" title="Assign a domain to this field.">Domain missing</span>;
}

export function ModelSeedCard({ seed, width, descriptionHeight, selected, relationshipDropTarget, displayMode, nameDisplayMode, vocabularyCache, owner, me, accessMode, onPointerDown, onUpdate, onEditingChange, remoteEditor, onUnlock, onRelationshipPointerDown, relationships, relationshipReferences, domains, domainCategories, onUpdateRelationshipReference, onDeleteRelationship, onCreateDomain, onOpenDomainDictionary, seeds, onApplyRefinement }: ModelSeedCardProps) {
  const { locale } = useI18n();
  const meta = roleMeta[seed.role];
  const lockedByMe = accessMode === "owner" && owner?.id === me.id;
  const lockedByOther = !!owner && !lockedByMe;
  const [fieldListOpen, setFieldListOpen] = useState(false);
  const [modelEditOpen, setModelEditOpen] = useState(false);
  const [titleDraft, setTitleDraft] = useState(() => seed.names === undefined ? seed.title : seed.names.business);
  const [descriptionDraft, setDescriptionDraft] = useState(seed.description);
  const titleEditingRef = useRef(false);
  const descriptionEditingRef = useRef(false);
  const titleCancelRef = useRef(false);
  const descriptionCancelRef = useRef(false);
  const fields = seed.fields ?? [];
  const inheritedParentIds = relationships.filter((relationship) => relationship.kind === "inherit" && relationship.sourceId === seed.id).map((relationship) => relationship.targetId);
  const inheritedFields = seeds.filter((candidate) => inheritedParentIds.includes(candidate.id)).flatMap((candidate) => candidate.fields.map((field) => ({ ...field, id: `inherited:${candidate.id}:${field.id}`, name: `${getFieldEffectiveName(field, domains)} ↗`, useDomainName: false })));
  const effectiveFields = [...fields, ...inheritedFields];
  const primaryKeyFields = effectiveFields.filter((field) => field.primaryKey);
  const favoriteFields = effectiveFields.filter((field) => field.important && !field.primaryKey);
  const partitionKeyFields = effectiveFields.flatMap((field) => expandDomainField(field, domains).filter((expanded) => expanded.partitionKey).map((expanded) => ({ ...expanded, fieldId: field.id })));
  const editableBusinessTitle = seed.names === undefined ? seed.title : seed.names.business;
  const modelStageLabel = getModelStageLabel(seed.maturedLevel);
  const projectedRelationshipReferences = relationships.flatMap((relationship) => {
    if (!relationshipDisplaySeedIDs(relationship).includes(seed.id)) return [];
    const reference = relationshipReferences.find((item) => item.relationshipId === relationship.id);
    return reference ? [{ relationship, reference }] : [];
  });
  const visibleRelationshipReferences = projectedRelationshipReferences.filter(({ reference }) => !(reference.hiddenOnModelIds ?? []).includes(seed.id));
  const summaryRowCount = primaryKeyFields.length + favoriteFields.length + partitionKeyFields.length + visibleRelationshipReferences.length;
  const summaryBodyHeight = Math.max(64, summaryRowCount * 22 + 12);
  const renderedCardHeight = displayMode === "key-fields" ? cardHeight + summaryBodyHeight - 64 : descriptionHeight;
  const descriptionBodyHeight = descriptionHeight - cardHeight + 64;

  useEffect(() => {
    if (!titleEditingRef.current) setTitleDraft(editableBusinessTitle);
  }, [editableBusinessTitle]);

  useEffect(() => {
    if (!descriptionEditingRef.current) setDescriptionDraft(seed.description);
  }, [seed.description]);

  useEffect(() => () => {
    if (titleEditingRef.current || descriptionEditingRef.current) onEditingChange(seed.id, false);
  }, [onEditingChange, seed.id]);

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      onPointerDown(event, seed);
    },
    [onPointerDown, seed]
  );

  const handleLockPointerDown = useCallback((event: PointerEvent<HTMLButtonElement>) => {
    event.stopPropagation();
  }, []);

  const handleUnlock = useCallback(() => {
    if (lockedByMe) onUnlock(seed.id);
  }, [lockedByMe, onUnlock, seed.id]);

  const handleRelationshipPointerDown = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      onRelationshipPointerDown(event, seed);
    },
    [onRelationshipPointerDown, seed]
  );

  const handleTitleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setTitleDraft(event.target.value);
    },
    []
  );

  const handleTitleFocus = useCallback(() => {
    if (!lockedByMe) return;
    titleEditingRef.current = true;
    titleCancelRef.current = false;
    setTitleDraft(editableBusinessTitle);
    onEditingChange(seed.id, true);
  }, [editableBusinessTitle, lockedByMe, onEditingChange, seed.id]);

  const handleTitleBlur = useCallback((event: FocusEvent<HTMLInputElement>) => {
    if (!titleEditingRef.current) return;
    titleEditingRef.current = false;
    if ((event.relatedTarget as HTMLElement | null)?.dataset.modelTextEditor !== seed.id) onEditingChange(seed.id, false);
    if (titleCancelRef.current) {
      titleCancelRef.current = false;
      setTitleDraft(editableBusinessTitle);
      return;
    }
    if (event.currentTarget.value !== editableBusinessTitle) onUpdate(seed.id, { names: updateNameSet(seed.title, seed.names, "business", event.currentTarget.value), vocabularyBinding: undefined });
  }, [editableBusinessTitle, onEditingChange, onUpdate, seed.id, seed.names, seed.title]);

  const handleTitleKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") event.currentTarget.blur();
    if (event.key === "Escape") {
      titleCancelRef.current = true;
      setTitleDraft(editableBusinessTitle);
      event.currentTarget.blur();
    }
  }, [editableBusinessTitle]);

  const handleDescriptionChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      setDescriptionDraft(event.target.value);
    },
    []
  );

  const handleDescriptionFocus = useCallback(() => {
    if (!lockedByMe) return;
    descriptionEditingRef.current = true;
    descriptionCancelRef.current = false;
    onEditingChange(seed.id, true);
  }, [lockedByMe, onEditingChange, seed.id]);

  const handleDescriptionBlur = useCallback((event: FocusEvent<HTMLTextAreaElement>) => {
    if (!descriptionEditingRef.current) return;
    descriptionEditingRef.current = false;
    if ((event.relatedTarget as HTMLElement | null)?.dataset.modelTextEditor !== seed.id) onEditingChange(seed.id, false);
    if (descriptionCancelRef.current) {
      descriptionCancelRef.current = false;
      setDescriptionDraft(seed.description);
      return;
    }
    if (event.currentTarget.value !== seed.description) onUpdate(seed.id, { description: event.currentTarget.value });
  }, [onEditingChange, onUpdate, seed.description, seed.id]);

  const handleDescriptionKeyDown = useCallback((event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Escape") return;
    descriptionCancelRef.current = true;
    setDescriptionDraft(seed.description);
    event.currentTarget.blur();
  }, [seed.description]);

  const handleOpenFieldList = useCallback(() => {
    setFieldListOpen(true);
  }, []);

  const handleCloseFieldList = useCallback(() => {
    setFieldListOpen(false);
  }, []);

  const handleOpenModelEdit = useCallback(() => {
    setModelEditOpen(true);
  }, []);

  const handleCloseModelEdit = useCallback(() => {
    setModelEditOpen(false);
  }, []);

  const handleSaveModelEdit = useCallback((patch: Partial<ModelSeed>) => {
    if (patch.description !== undefined) setDescriptionDraft(patch.description);
    onUpdate(seed.id, patch);
    setModelEditOpen(false);
  }, [onUpdate, seed.id]);

  const handleFieldsChange = useCallback(
    (nextFields: ModelField[]) => {
      onUpdate(seed.id, { fields: nextFields });
    },
    [onUpdate, seed.id]
  );
  const handleModelDefinitionChange = useCallback(
    (patch: Partial<ModelSeed>) => {
      onUpdate(seed.id, patch);
    },
    [onUpdate, seed.id]
  );

  const handleOpenDomainDictionary = useCallback(
    (fieldId?: string) => {
      onOpenDomainDictionary(seed.id, fieldId);
    },
    [onOpenDomainDictionary, seed.id]
  );

  const handleEditablePointerDown = useCallback(
    (event: PointerEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (lockedByMe) event.stopPropagation();
    },
    [lockedByMe]
  );

  return (
    <article
      className={`model-seed-card group absolute select-none p-4 ${selected || relationshipDropTarget ? "is-selected" : ""} ${relationshipDropTarget ? "is-relationship-drop-target" : ""} ${
        lockedByOther ? "is-locked" : ""
      }`}
      style={{
        left: seed.x,
        top: seed.y,
        width,
        height: renderedCardHeight,
        transform: `rotate(${seed.rotation}deg)`
      }}
      onPointerDown={handlePointerDown}
    >
      <RoughShape
        width={width}
        height={renderedCardHeight}
        roughness={seed.maturedLevel}
        fill={seed.dependency === "independent" ? meta.fill.replace("0.96", "0.58") : meta.fill}
        stroke={seed.dependency === "independent" ? `${meta.stroke}88` : meta.stroke}
        selected={selected || relationshipDropTarget}
        subtle={seed.dependency === "independent"}
      />

      <div className="relative">
        {accessMode === "readonly" && <span className="absolute -left-1 -top-9 z-10 rounded-full border border-slate-300 bg-white px-2 py-1 text-[11px] font-bold text-slate-600 shadow-sm">readonly</span>}
        {owner && (
          <button
            data-no-drag="true"
            type="button"
            className="absolute -right-1 -top-9 z-10 flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold text-white shadow-sm"
            style={{ backgroundColor: owner.color }}
            onPointerDown={handleLockPointerDown}
            onClick={handleUnlock}
            title={lockedByMe ? "Click to unlock" : `Locked by ${owner.name}`}
          >
            <Lock size={11} />
            {lockedByMe ? "You" : <span data-i18n-skip>{owner.name}</span>}
          </button>
        )}
        <div className="flex items-start gap-3">
          <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white/80 text-slate-800">
            <Database size={18} strokeWidth={2.1} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{modelStageLabel}</p>
            {nameDisplayMode === "business" ? <input
              data-no-drag="true"
              data-model-text-editor={seed.id}
              readOnly={!lockedByMe}
              className="h-7 w-full whitespace-nowrap rounded-md bg-transparent text-xl font-bold leading-7 outline-none focus:bg-white/80 focus:px-1"
              value={titleDraft}
              onFocus={handleTitleFocus}
              onChange={handleTitleChange}
              onBlur={handleTitleBlur}
              onKeyDown={handleTitleKeyDown}
              onPointerDown={handleEditablePointerDown}
              aria-label={`${editableBusinessTitle || "Untitled model"} title`}
            /> : <div className="h-7 w-full whitespace-nowrap rounded-md text-xl font-bold leading-7"><VocabularyDisplayName cache={vocabularyCache} cacheKey={`table:${seed.id}`} legacyName={seed.title} names={seed.names} mode={nameDisplayMode} /></div>}
          </div>
          <div className="pointer-events-none absolute right-0 top-0 flex gap-1 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
            <button data-no-drag="true" type="button" className="btn btn-ghost btn-sm btn-square shrink-0 rounded-lg bg-white/60 text-slate-600 hover:bg-white" aria-label={`Edit model settings for ${seed.title}`} aria-haspopup="dialog" onClick={handleOpenModelEdit}>
              <Pencil size={16} />
            </button>
            <button data-no-drag="true" type="button" className="btn btn-ghost btn-sm btn-square shrink-0 rounded-lg bg-white/60 text-slate-600 hover:bg-white" aria-label={`Edit fields for ${seed.title}`} aria-haspopup="dialog" onClick={handleOpenFieldList}>
              <Menu size={18} />
            </button>
          </div>
        </div>

        <div key={displayMode} className="model-card-content relative mt-1.5" style={{ height: displayMode === "key-fields" ? summaryBodyHeight : descriptionBodyHeight }}>
          {remoteEditor && <span className="pointer-events-none absolute -top-7 right-0 z-20 flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold text-white shadow" style={{ backgroundColor: remoteEditor.color }}><Pencil className="cowork-pencil" size={11} /><span data-i18n-skip>{remoteEditor.name}</span> editing</span>}
          {displayMode === "description" ? (
            <textarea
              data-no-drag="true"
              data-model-text-editor={seed.id}
              readOnly={!lockedByMe}
              className="h-full w-full resize-none overflow-hidden rounded-md bg-transparent text-sm leading-5 text-slate-700 outline-none focus:bg-white/80 focus:px-1"
              value={descriptionDraft}
              onFocus={handleDescriptionFocus}
              onChange={handleDescriptionChange}
              onBlur={handleDescriptionBlur}
              onKeyDown={handleDescriptionKeyDown}
              onPointerDown={handleEditablePointerDown}
              aria-label={`${seed.title} description`}
            />
          ) : (
            <div className="h-full rounded-md bg-white/45 px-2 py-1.5" aria-label={`${seed.title} key fields`}>
              {summaryRowCount === 0 ? (
                <p className="pt-3 text-center text-xs font-medium text-slate-500">No primary, important, or partition-key fields</p>
              ) : (
                <ul className="space-y-1">
                  {primaryKeyFields.map((field) => (
                    <li key={field.id} className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_minmax(80px,42%)] items-center gap-1.5 font-mono text-xs text-slate-700">
                      <KeyRound size={12} className="shrink-0 text-violet-700" aria-label="Primary key" />
                      <span className="truncate font-semibold"><VocabularyDisplayName cache={vocabularyCache} cacheKey={`field:${seed.id}:${field.id}`} legacyName={getFieldEffectiveName(field, domains, nameDisplayMode)} names={field.names} mode={nameDisplayMode} /></span>
                      <FieldDomainDisplay domainId={field.domainId} nameDisplayMode={nameDisplayMode} domains={domains} vocabularyCache={vocabularyCache} />
                    </li>
                  ))}
                  {favoriteFields.map((field) => (
                    <li key={field.id} className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_minmax(80px,42%)] items-center gap-1.5 font-mono text-xs text-slate-700">
                      <Star size={12} className="shrink-0 fill-amber-400 text-amber-600" aria-label="Important" />
                      <span className="truncate font-semibold"><VocabularyDisplayName cache={vocabularyCache} cacheKey={`field:${seed.id}:${field.id}`} legacyName={getFieldEffectiveName(field, domains, nameDisplayMode)} names={field.names} mode={nameDisplayMode} /></span>
                      <FieldDomainDisplay domainId={field.domainId} nameDisplayMode={nameDisplayMode} domains={domains} vocabularyCache={vocabularyCache} />
                    </li>
                  ))}
                  {partitionKeyFields.map((field) => (
                    <li key={`${field.fieldId}:${field.componentId ?? "scalar"}`} className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_minmax(80px,42%)] items-center gap-1.5 rounded bg-cyan-50 px-1 font-mono text-xs text-cyan-900">
                      <Columns3 size={12} className="shrink-0 text-cyan-700" aria-label="Partition key" />
                      <span data-i18n-skip className="truncate font-semibold">{field.name}</span>
                      <FieldDomainDisplay domainId={field.domainId} nameDisplayMode={nameDisplayMode} domains={domains} vocabularyCache={vocabularyCache} />
                    </li>
                  ))}
                  {visibleRelationshipReferences.map(({ relationship }) => (
                    <li key={relationship.id} className="flex min-w-0 items-center gap-1.5 rounded bg-blue-50 px-1 font-mono text-xs text-blue-900">
                      <Link2 size={12} className="shrink-0 text-blue-700" aria-label="Relationship reference" />
                      <span data-i18n-skip className="truncate font-semibold">{relationship.name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="mt-2 flex flex-nowrap gap-1.5 whitespace-nowrap">
          {flattenLabels(seed).map((tag) => (
            <span
              key={tag}
              className={`rounded-md border px-2 py-1 text-xs font-semibold ${
                tag === seed.role ? roleMeta[seed.role].chip : "border-slate-200 bg-white/80 text-slate-700"
              }`}
            >
              {translateText(tag === seed.dependency ? dependencyLabels[seed.dependency] : tag, locale)}
            </span>
          ))}
        </div>
      </div>
      {selected && (
        <button
          data-no-drag="true"
          type="button"
          className="absolute -bottom-2 -right-2 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-blue-200 bg-white text-blue-700 shadow-md transition hover:scale-105 hover:bg-blue-50 disabled:cursor-wait disabled:opacity-50"
          aria-label={`Create relationship from ${seed.title}`}
          title="Drag to another model to create a relationship"
          disabled={!lockedByMe}
          onPointerDown={handleRelationshipPointerDown}
        >
          <Link2 size={16} />
        </button>
      )}
      {relationshipDropTarget && (
        <span className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-700 px-3 py-1 text-xs font-bold text-white shadow-lg">
          Release to connect
        </span>
      )}
      {fieldListOpen && (
        <FieldListDialog
          modelId={seed.id}
          modelTitle={seed.title}
          modelNames={seed.names}
          initialNameDisplayMode={nameDisplayMode}
          vocabularyCache={vocabularyCache}
          modelMaturedLevel={seed.maturedLevel}
          fields={fields}
          domains={domains}
          domainCategories={domainCategories}
          relationshipReferences={projectedRelationshipReferences}
          seeds={seeds}
          allRelationships={relationships}
          allRelationshipReferences={relationshipReferences}
          canEdit={lockedByMe}
          onChange={handleFieldsChange}
          onModelChange={handleModelDefinitionChange}
          onUpdateReference={onUpdateRelationshipReference}
          onDeleteReference={onDeleteRelationship}
          onCreateDomain={onCreateDomain}
          onOpenDomainDictionary={handleOpenDomainDictionary}
          onClose={handleCloseFieldList}
          onApplyRefinement={onApplyRefinement}
        />
      )}
      {modelEditOpen && <ModelEditDialog model={seed} domains={domains} canEdit={lockedByMe} onSave={handleSaveModelEdit} onClose={handleCloseModelEdit} />}
    </article>
  );
}
