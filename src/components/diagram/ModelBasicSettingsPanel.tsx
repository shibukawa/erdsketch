import { useCallback, type ChangeEvent, type MouseEvent } from "react";
import { dependencyLabels, dependencyOptions, roleMeta, roleOptions } from "../../features/modeling/constants";
import { defaultVolumeEstimate, normalizeTransactionRetention } from "../../features/modeling/capacity";
import type { Dependency, EntityRole, ModelSeed } from "../../features/modeling/types";
import { getModelStageLabel, updateNameSet } from "../../features/modeling/utils";

type ModelBasicSettingsPanelProps = {
  model: ModelSeed;
  canEdit: boolean;
  onChange: (patch: Partial<ModelSeed>) => void;
};

export function ModelBasicSettingsPanel({ model, canEdit, onChange }: ModelBasicSettingsPanelProps) {
  const businessName = model.names?.business ?? model.title;

  const handleNameChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    onChange({ names: updateNameSet(model.title, model.names, "business", event.target.value), vocabularyBinding: undefined });
  }, [model.names, model.title, onChange]);
  const handleNoteChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
    onChange({ description: event.target.value });
  }, [onChange]);
  const handleRoleClick = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    const role = event.currentTarget.dataset.role as EntityRole;
    const volumeEstimate = model.volumeEstimate ?? defaultVolumeEstimate(role);
    onChange({ role, volumeEstimate: { ...volumeEstimate, retentionPeriod: normalizeTransactionRetention(role, volumeEstimate.retentionPeriod) } });
  }, [model.volumeEstimate, onChange]);
  const handleDependencyClick = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    onChange({ dependency: event.currentTarget.dataset.dependency as Dependency });
  }, [onChange]);
  const handlePrivacyChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    onChange({ hasPrivacy: event.target.checked });
  }, [onChange]);

  return (
    <div className="mx-auto max-w-3xl p-6">
      <fieldset disabled={!canEdit} className="disabled-controls space-y-6">
        <div className="grid gap-5 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-bold text-slate-700">Model name</span>
            <input className="input input-bordered mt-1 w-full bg-white" value={businessName} onChange={handleNameChange} />
          </label>
          <label className="block md:row-span-2">
            <span className="text-sm font-bold text-slate-700">Note</span>
            <textarea className="textarea textarea-bordered mt-1 h-32 w-full resize-none bg-white" value={model.description} onChange={handleNoteChange} />
          </label>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"><span className="text-xs font-semibold text-slate-500">Automatic maturity</span><p className="mt-1 text-sm font-bold text-slate-700">{getModelStageLabel(model.maturedLevel)}</p></div>
        </div>

        <div className="grid gap-5 border-t border-slate-200 pt-5 md:grid-cols-2">
          <div>
            <p className="text-sm font-bold text-slate-700">Role</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {roleOptions.map((role) => (
                <button key={role} type="button" data-role={role} className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${model.role === role ? roleMeta[role].chip : "border-slate-200 bg-white text-slate-700"}`} onClick={handleRoleClick}>
                  {role}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-700">Table type</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {dependencyOptions.map((dependency) => (
                <button key={dependency} type="button" data-dependency={dependency} className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${model.dependency === dependency ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-700"}`} onClick={handleDependencyClick}>
                  {dependencyLabels[dependency]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <label className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white px-4 py-3">
          <span><span className="block text-sm font-bold text-slate-700">Privacy</span><span className="block text-xs text-slate-500">Mark this model as containing privacy-sensitive information.</span></span>
          <input type="checkbox" className="toggle toggle-primary" checked={model.hasPrivacy} onChange={handlePrivacyChange} />
        </label>
      </fieldset>
      {!canEdit && <p className="mt-5 rounded-md bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">This model is read-only. Lock its card to edit model settings.</p>}
    </div>
  );
}
