import { Lock, Trash2 } from "lucide-react";
import { useCallback, type ChangeEvent, type MouseEvent } from "react";
import type { Collaborator } from "../../collaboration";
import { dependencyLabels, dependencyOptions, roleMeta, roleOptions } from "../../features/modeling/constants";
import type { CanvasModelPlacement, Dependency, EntityRole, ModelSeed } from "../../features/modeling/types";
import { updateNameSet } from "../../features/modeling/utils";
import { defaultVolumeEstimate, normalizeTransactionRetention } from "../../features/modeling/capacity";
import { CommittedTextInput } from "../forms/CommittedTextInput";
import { CommittedTextarea } from "../forms/CommittedTextarea";

type SeedInspectorProps = {
  seed: ModelSeed;
  owner?: Collaborator;
  canEdit: boolean;
  placement?: CanvasModelPlacement;
  onUpdate: (seedId: string, patch: Partial<ModelSeed>) => void;
  onDelete: () => void;
  canDelete: boolean;
  deleting: boolean;
};

export function SeedInspector({ seed, owner, canEdit, placement, onUpdate, onDelete, canDelete, deleting }: SeedInspectorProps) {
  const handleNameCommit = useCallback((value: string) => {
    onUpdate(seed.id, { names: updateNameSet(seed.title, seed.names, "business", value), vocabularyBinding: undefined });
  }, [onUpdate, seed.id, seed.names, seed.title]);
  const handleDescriptionCommit = useCallback((value: string) => onUpdate(seed.id, { description: value }), [onUpdate, seed.id]);

  const handleRoleClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      const role = event.currentTarget.dataset.role as EntityRole;
      const volumeEstimate = seed.volumeEstimate ?? defaultVolumeEstimate(role);
      onUpdate(seed.id, { role, volumeEstimate: { ...volumeEstimate, retentionPeriod: normalizeTransactionRetention(role, volumeEstimate.retentionPeriod) } });
    },
    [onUpdate, seed.id, seed.volumeEstimate]
  );

  const handleDependencyClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      onUpdate(seed.id, { dependency: event.currentTarget.dataset.dependency as Dependency });
    },
    [onUpdate, seed.id]
  );

  const handlePrivacyChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onUpdate(seed.id, { hasPrivacy: event.target.checked });
    },
    [onUpdate, seed.id]
  );

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="mt-1 truncate text-lg font-bold">{seed.title}</h2>

      <div
        className={`mt-3 flex items-center gap-2 rounded-md px-2.5 py-2 text-xs font-semibold ${
          canEdit ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"
        }`}
      >
        <Lock size={13} />
        {placement?.accessMode === "readonly" ? "Read-only on this canvas" : canEdit ? "Locked by you — editing enabled" : owner ? `Locked by ${owner.name}` : "Click the card to lock and edit"}
      </div>

      <fieldset disabled={!canEdit} className="disabled-controls">
        <div className="mt-4 space-y-4">
          <label className="block"><span className="mb-1 block text-sm font-bold text-slate-600">Model name</span><CommittedTextInput className="input input-bordered input-sm w-full" value={seed.names?.business || seed.title} onCommit={handleNameCommit}/></label>
          <label className="block"><span className="mb-1 block text-sm font-bold text-slate-600">Description</span><CommittedTextarea className="textarea textarea-bordered h-20 w-full" value={seed.description} onCommit={handleDescriptionCommit}/></label>
          <div>
            <p className="text-sm font-bold text-slate-600">Role</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {roleOptions.map((role) => (
                <button
                  key={role}
                  data-role={role}
                  className={`rounded-md border px-2 py-1 text-xs font-semibold ${
                    seed.role === role ? roleMeta[role].chip : "border-slate-200 bg-slate-50 text-slate-700"
                  }`}
                  onClick={handleRoleClick}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-bold text-slate-600">Table type</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {dependencyOptions.map((dependency) => (
                <button
                  key={dependency}
                  data-dependency={dependency}
                  className={`rounded-md border px-2 py-1 text-xs font-semibold ${
                    seed.dependency === dependency
                      ? "border-slate-950 bg-slate-950 text-white"
                      : "border-slate-200 bg-slate-50 text-slate-700"
                  }`}
                  onClick={handleDependencyClick}
                >
                  {dependencyLabels[dependency]}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <span className="text-sm font-bold text-slate-600">Privacy</span>
            <input
              type="checkbox"
              className="toggle toggle-primary toggle-sm"
              checked={seed.hasPrivacy}
              onChange={handlePrivacyChange}
            />
          </label>
        </div>
      </fieldset>
      <button type="button" className="btn btn-ghost mt-4 w-full justify-start gap-2 text-red-600 hover:bg-red-50 hover:text-red-700" onClick={onDelete} disabled={!canDelete || deleting}><Trash2 size={15}/>{placement?.accessMode === "owner" ? "Delete from project" : "Remove from this canvas"}</button>
    </div>
  );
}
