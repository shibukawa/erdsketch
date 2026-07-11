import { Database, KeyRound, Link2, Lock, Menu, Star } from "lucide-react";
import { useCallback, useState, type ChangeEvent, type PointerEvent } from "react";
import type { Collaborator } from "../../collaboration";
import { cardHeight, cardWidth, roleMeta } from "../../features/modeling/constants";
import type { CardDisplayMode, ModelField, ModelSeed, Relationship, RelationshipReference } from "../../features/modeling/types";
import { flattenLabels, getModelStageLabel, relationshipDisplaySeedIDs } from "../../features/modeling/utils";
import { FieldListDialog } from "./FieldListDialog";
import { RoughShape } from "./RoughShape";

type ModelSeedCardProps = {
  seed: ModelSeed;
  selected: boolean;
  relationshipDropTarget: boolean;
  displayMode: CardDisplayMode;
  owner?: Collaborator;
  me: Collaborator;
  onPointerDown: (event: PointerEvent<HTMLElement>, seed: ModelSeed) => void;
  onUpdate: (seedId: string, patch: Partial<ModelSeed>) => void;
  onUnlock: (seedId: string) => void;
  onRelationshipPointerDown: (event: PointerEvent<HTMLButtonElement>, seed: ModelSeed) => void;
  relationships: Relationship[];
  relationshipReferences: RelationshipReference[];
  onUpdateRelationshipReference: (relationshipId: string, patch: Partial<RelationshipReference>) => void;
  onDeleteRelationship: (relationshipId: string) => void;
};

export function ModelSeedCard({ seed, selected, relationshipDropTarget, displayMode, owner, me, onPointerDown, onUpdate, onUnlock, onRelationshipPointerDown, relationships, relationshipReferences, onUpdateRelationshipReference, onDeleteRelationship }: ModelSeedCardProps) {
  const meta = roleMeta[seed.role];
  const lockedByMe = owner?.id === me.id;
  const lockedByOther = !!owner && !lockedByMe;
  const [fieldListOpen, setFieldListOpen] = useState(false);
  const fields = seed.fields ?? [];
  const primaryKeyFields = fields.filter((field) => field.primaryKey);
  const favoriteFields = fields.filter((field) => field.important && !field.primaryKey);
  const primaryKeySummary =
    primaryKeyFields.length > 1
      ? `(${primaryKeyFields.map((field) => field.name).join(", ")})`
      : primaryKeyFields[0]?.name;
  const summaryRowCount = (primaryKeySummary ? 1 : 0) + favoriteFields.length;
  const summaryBodyHeight = Math.max(64, summaryRowCount * 20 + 12);
  const renderedCardHeight = displayMode === "key-fields" ? cardHeight + summaryBodyHeight - 64 : cardHeight;
  const modelStageLabel = getModelStageLabel(seed.maturedLevel);
  const visibleRelationshipReferences = relationships.flatMap((relationship) => {
    if (!relationshipDisplaySeedIDs(relationship).includes(seed.id)) return [];
    const reference = relationshipReferences.find((item) => item.relationshipId === relationship.id);
    return reference ? [{ relationship, reference }] : [];
  });

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
      onUpdate(seed.id, { title: event.target.value });
    },
    [onUpdate, seed.id]
  );

  const handleDescriptionChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      onUpdate(seed.id, { description: event.target.value });
    },
    [onUpdate, seed.id]
  );

  const handleOpenFieldList = useCallback(() => {
    setFieldListOpen(true);
  }, []);

  const handleCloseFieldList = useCallback(() => {
    setFieldListOpen(false);
  }, []);

  const handleFieldsChange = useCallback(
    (nextFields: ModelField[]) => {
      onUpdate(seed.id, { fields: nextFields });
    },
    [onUpdate, seed.id]
  );

  const handleEditablePointerDown = useCallback(
    (event: PointerEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (lockedByMe) event.stopPropagation();
    },
    [lockedByMe]
  );

  return (
    <article
      className={`model-seed-card absolute w-[270px] select-none p-4 ${selected || relationshipDropTarget ? "is-selected" : ""} ${relationshipDropTarget ? "is-relationship-drop-target" : ""} ${
        lockedByOther ? "is-locked" : ""
      }`}
      style={{
        left: seed.x,
        top: seed.y,
        height: renderedCardHeight,
        transform: `rotate(${seed.rotation}deg)`
      }}
      onPointerDown={handlePointerDown}
    >
      <RoughShape
        width={cardWidth}
        height={renderedCardHeight}
        roughness={seed.maturedLevel}
        fill={meta.fill}
        stroke={meta.stroke}
        selected={selected || relationshipDropTarget}
      />

      <div className="relative">
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
            {lockedByMe ? "You" : owner.name}
          </button>
        )}
        <div className="flex items-start gap-3">
          <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white/80 text-slate-800">
            <Database size={18} strokeWidth={2.1} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{modelStageLabel}</p>
            <input
              data-no-drag="true"
              readOnly={!lockedByMe}
              className="w-full rounded-md bg-transparent text-xl font-bold leading-tight outline-none focus:bg-white/80 focus:px-1"
              value={seed.title}
              onChange={handleTitleChange}
              onPointerDown={handleEditablePointerDown}
              aria-label={`${seed.title} title`}
            />
          </div>
          <button
            data-no-drag="true"
            type="button"
            className="btn btn-ghost btn-sm btn-square -mr-1 -mt-1 shrink-0 rounded-lg bg-white/60 text-slate-600 hover:bg-white"
            aria-label={`Edit fields for ${seed.title}`}
            aria-haspopup="dialog"
            onClick={handleOpenFieldList}
          >
            <Menu size={18} />
          </button>
        </div>

        <div key={displayMode} className="model-card-content mt-3" style={{ height: displayMode === "key-fields" ? summaryBodyHeight : 64 }}>
          {displayMode === "description" ? (
            <textarea
              data-no-drag="true"
              readOnly={!lockedByMe}
              className="h-full w-full resize-none rounded-md bg-transparent text-sm leading-5 text-slate-700 outline-none focus:bg-white/80 focus:px-1"
              value={seed.description}
              onChange={handleDescriptionChange}
              onPointerDown={handleEditablePointerDown}
              aria-label={`${seed.title} description`}
            />
          ) : (
            <div className="h-full rounded-md bg-white/45 px-2 py-1.5" aria-label={`${seed.title} key fields`}>
              {summaryRowCount === 0 ? (
                <p className="pt-3 text-center text-xs font-medium text-slate-500">No primary or important fields</p>
              ) : (
                <ul className="space-y-1">
                  {primaryKeySummary && (
                    <li className="flex min-w-0 items-center gap-1.5 font-mono text-xs text-slate-700">
                      <KeyRound size={12} className="shrink-0 text-violet-700" aria-label="Primary key" />
                      <span className="font-semibold">{primaryKeySummary}</span>
                    </li>
                  )}
                  {favoriteFields.map((field) => (
                    <li key={field.id} className="flex min-w-0 items-center gap-1.5 font-mono text-xs text-slate-700">
                      <Star size={12} className="shrink-0 fill-amber-400 text-amber-600" aria-label="Important" />
                      <span className="font-semibold">{field.name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {flattenLabels(seed).map((tag) => (
            <span
              key={tag}
              className={`rounded-md border px-2 py-1 text-xs font-semibold ${
                tag === seed.role ? roleMeta[seed.role].chip : "border-slate-200 bg-white/80 text-slate-700"
              }`}
            >
              {tag}
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
          modelTitle={seed.title}
          modelMaturedLevel={seed.maturedLevel}
          fields={fields}
          relationshipReferences={visibleRelationshipReferences}
          canEdit={lockedByMe}
          onChange={handleFieldsChange}
          onUpdateReference={onUpdateRelationshipReference}
          onDeleteReference={onDeleteRelationship}
          onClose={handleCloseFieldList}
        />
      )}
    </article>
  );
}
