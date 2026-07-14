import { Lock } from "lucide-react";
import { useCallback, type ChangeEvent, type MouseEvent } from "react";
import type { Collaborator } from "../../collaboration";
import { dependencyOptions, maturedLevelSteps, roleMeta, roleOptions } from "../../features/modeling/constants";
import type { CanvasModelPlacement, Dependency, EntityRole, ModelSeed } from "../../features/modeling/types";
import { clampMaturedLevel, getModelStageLabel } from "../../features/modeling/utils";

type SeedInspectorProps = {
  seed: ModelSeed;
  owner?: Collaborator;
  canEdit: boolean;
  placement?: CanvasModelPlacement;
  onUpdate: (seedId: string, patch: Partial<ModelSeed>) => void;
};

const maturedStepLabels = new Map([
  [6, "seed"],
  [3.5, "concept"],
  [1.25, "logical"],
  [0.5, "matured"]
]);

export function SeedInspector({ seed, owner, canEdit, placement, onUpdate }: SeedInspectorProps) {
  const handleMaturedLevelChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onUpdate(seed.id, { maturedLevel: clampMaturedLevel(Number(event.target.value)) });
    },
    [onUpdate, seed.id]
  );

  const handleMaturedLevelClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      onUpdate(seed.id, { maturedLevel: Number(event.currentTarget.dataset.maturedLevel) });
    },
    [onUpdate, seed.id]
  );

  const handleRoleClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      onUpdate(seed.id, { role: event.currentTarget.dataset.role as EntityRole });
    },
    [onUpdate, seed.id]
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
    <section className="mt-5 min-h-[320px] overflow-auto rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Selected model seed</p>
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
        <label className="mt-4 block">
          <span className="flex items-center justify-between gap-3 text-sm font-bold text-slate-600">
            <span>Matured level</span>
            <span className="text-[10px] tracking-wide text-slate-400">{getModelStageLabel(seed.maturedLevel)}</span>
          </span>
          <input
            type="range"
            className="range range-primary range-sm mt-2"
            min={0.5}
            max={6}
            step={0.25}
            value={seed.maturedLevel}
            onChange={handleMaturedLevelChange}
            style={{ direction: "rtl" }}
          />
        </label>
        <div className="mt-2 grid grid-cols-4 gap-1">
          {[...maturedLevelSteps].reverse().map((step) => (
            <button
              key={step}
              data-matured-level={step}
              className={`btn btn-xs min-h-8 rounded-md px-1 text-[7px] ${seed.maturedLevel === step ? "btn-neutral" : "btn-outline"}`}
              onClick={handleMaturedLevelClick}
            >
              {maturedStepLabels.get(step)}
            </button>
          ))}
        </div>

        <div className="mt-5 space-y-4">
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
            <p className="text-sm font-bold text-slate-600">Dependency</p>
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
                  {dependency}
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
    </section>
  );
}
