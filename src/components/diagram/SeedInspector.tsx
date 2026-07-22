import { Lock, Trash2 } from "lucide-react";
import type { ChangeEvent, MouseEvent } from "react";
import type { Collaborator } from "../../collaboration";
import { dependencyLabels, dependencyOptions, roleMeta, roleOptions } from "../../features/modeling/constants";
import type { CanvasModelPlacement, Dependency, EntityRole, ModelSeed } from "../../features/modeling/types";
import { defaultVolumeEstimate, normalizeTransactionRetention } from "../../features/modeling/capacity";

type SeedInspectorProps = {
  seed: ModelSeed;
  owner?: Collaborator;
  canEdit: boolean;
  placement?: CanvasModelPlacement;
  onUpdate: (seedId: string, patch: Partial<ModelSeed>) => Promise<boolean>;
  onDelete: () => void;
  canDelete: boolean;
  deleting: boolean;
};

export function SeedInspector({ seed, owner, canEdit, placement, onUpdate, onDelete, canDelete, deleting }: SeedInspectorProps) {
  async function handleRoleClick(event: MouseEvent<HTMLButtonElement>) {
    const role = event.currentTarget.dataset.role as EntityRole;
    const volumeEstimate = seed.volumeEstimate ?? defaultVolumeEstimate(role);
    await onUpdate(seed.id, { role, volumeEstimate: { ...volumeEstimate, retentionPeriod: normalizeTransactionRetention(role, volumeEstimate.retentionPeriod) } });
  }

  async function handleDependencyClick(event: MouseEvent<HTMLButtonElement>) {
    await onUpdate(seed.id, { dependency: event.currentTarget.dataset.dependency as Dependency });
  }

  async function handlePrivacyChange(event: ChangeEvent<HTMLInputElement>) {
    await onUpdate(seed.id, { hasPrivacy: event.target.checked });
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 data-i18n-skip className="mt-1 truncate text-lg font-bold">{seed.title}</h2>

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
