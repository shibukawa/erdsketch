import { useCallback, type ChangeEvent } from "react";
import type { ColumnDefault, DataDomain, ModelField, ValueGeneration } from "../../features/modeling/types";
import { effectivePrimitiveType } from "../../features/modeling/capacity";

type FieldDefinitionPanelProps = {
  field?: ModelField;
  domains: DataDomain[];
  canEdit: boolean;
  onChange: (fieldId: string, patch: Partial<ModelField>) => void;
};

type DefaultKind = "none" | ColumnDefault["kind"];

export function FieldDefinitionPanel({ field, domains, canEdit, onChange }: FieldDefinitionPanelProps) {
  const primitiveType = field ? effectivePrimitiveType(field, domains) : undefined;
  const variableWidth = primitiveType === "varchar" || primitiveType === "text" || primitiveType === "blob";
  const autoIncrementEligible = !!field?.primaryKey && primitiveType === "integer";

  const handleRequiredChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    if (field) onChange(field.id, { required: event.target.checked });
  }, [field, onChange]);
  const handleUniqueChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    if (field) onChange(field.id, { unique: event.target.checked });
  }, [field, onChange]);
  const handleDefaultKindChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    if (!field) return;
    const kind = event.target.value as DefaultKind;
    const defaultValue: ColumnDefault | undefined = kind === "none" ? undefined : kind === "literal" ? { kind, value: "" } : { kind };
    onChange(field.id, { defaultValue });
  }, [field, onChange]);
  const handleDefaultLiteralChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    if (field) onChange(field.id, { defaultValue: { kind: "literal", value: event.target.value } });
  }, [field, onChange]);
  const handleValueGenerationChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    if (field) onChange(field.id, { valueGeneration: event.target.value === "auto_increment" ? event.target.value as ValueGeneration : undefined });
  }, [field, onChange]);
  const handleAverageSizeChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    if (!field) return;
    const value = event.target.value === "" ? undefined : Math.max(0, Number(event.target.value));
    onChange(field.id, { estimatedAverageSizeBytes: value });
  }, [field, onChange]);
  if (!field) return <div className="p-4 text-sm text-slate-500">Select a field to edit its SQL and capacity settings.</div>;

  return (
    <div className="space-y-4 overflow-y-auto p-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-blue-600">Field definition</p>
        <h3 className="mt-1 break-words font-mono text-sm font-bold text-slate-900">{field.name || "Untitled field"}</h3>
        <p className="mt-1 text-xs text-slate-500">Effective type: {primitiveType ?? "unresolved"}</p>
      </div>

      <fieldset disabled={!canEdit} className="space-y-2 disabled-controls">
        <label className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
          <span><span className="block text-sm font-bold">NOT NULL</span><span className="block text-[11px] text-slate-500">Required value</span></span>
          <input type="checkbox" className="toggle toggle-primary toggle-sm" checked={field.primaryKey || !!field.required} disabled={!canEdit || field.primaryKey} onChange={handleRequiredChange} />
        </label>
        <label className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
          <span><span className="block text-sm font-bold">UNIQUE</span><span className="block text-[11px] text-slate-500">Single-column constraint</span></span>
          <input type="checkbox" className="toggle toggle-primary toggle-sm" checked={field.primaryKey || !!field.unique} disabled={!canEdit || field.primaryKey} onChange={handleUniqueChange} />
        </label>

        <label className="block">
          <span className="text-sm font-bold text-slate-700">Default</span>
          <select className="select select-bordered select-sm mt-1 w-full" value={field.defaultValue?.kind ?? "none"} onChange={handleDefaultKindChange}>
            <option value="none">None</option>
            <option value="literal">Literal</option>
            <option value="current_date">CURRENT_DATE</option>
            <option value="current_timestamp">CURRENT_TIMESTAMP</option>
          </select>
        </label>
        {field.defaultValue?.kind === "literal" && <label className="block"><span className="text-xs font-bold text-slate-600">Literal value</span><input className="input input-bordered input-sm mt-1 w-full font-mono" value={field.defaultValue.value} onChange={handleDefaultLiteralChange} /></label>}

        <label className="block">
          <span className="text-sm font-bold text-slate-700">Value generation</span>
          <select className="select select-bordered select-sm mt-1 w-full" value={field.valueGeneration ?? "none"} disabled={!canEdit || (!autoIncrementEligible && field.valueGeneration !== "auto_increment")} onChange={handleValueGenerationChange}>
            <option value="none">None</option>
            <option value="auto_increment" disabled={!autoIncrementEligible}>Auto increment</option>
          </select>
          {!autoIncrementEligible && <span className="mt-1 block text-[11px] text-slate-500">Auto increment requires an integer primary key.</span>}
        </label>

        {variableWidth && <label className="block rounded-lg border border-cyan-200 bg-cyan-50 p-3"><span className="text-sm font-bold text-cyan-950">Estimated average size</span><div className="mt-2 flex items-center gap-2"><input type="number" min={0} step={1} className="input input-bordered input-sm min-w-0 flex-1 bg-white" value={field.estimatedAverageSizeBytes ?? ""} placeholder={primitiveType === "varchar" ? "Optional" : "Required for estimate"} onChange={handleAverageSizeChange} /><span className="text-xs font-bold text-cyan-800">bytes</span></div><span className="mt-1 block text-[11px] text-cyan-800">Capacity estimate only; DDL type is unchanged.</span></label>}
      </fieldset>
    </div>
  );
}
