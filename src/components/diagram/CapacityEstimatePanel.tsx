import { Database, HardDrive } from "lucide-react";
import type { ChangeEvent } from "react";
import { defaultVolumeEstimate, estimateCapacity, formatBytes, indexStructureCount, normalizeTransactionRetention, projectionHorizonsForModel, retentionValueMax } from "../../features/modeling/capacity";
import type { DataDomain, DurationUnit, EstimatePeriod, ModelSeed, VolumeEstimate } from "../../features/modeling/types";

type CapacityEstimatePanelProps = {
  model: ModelSeed;
  domains: DataDomain[];
  canEdit: boolean;
  onChange: (value: VolumeEstimate) => void;
};

export function CapacityEstimatePanel({ model, domains, canEdit, onChange }: CapacityEstimatePanelProps) {
  const value = structuredClone(model.volumeEstimate ?? defaultVolumeEstimate(model.role));
  const estimate = { ...value, retentionPeriod: normalizeTransactionRetention(model.role, value.retentionPeriod) };
  const projectionModel = { ...model, volumeEstimate: estimate };
  const horizons = projectionHorizonsForModel(projectionModel);
  const projections = horizons.map((horizon) => estimateCapacity(projectionModel, domains, horizon));
  const indexStructures = indexStructureCount(model);
  const missingDomainFields = [...new Set(projections.flatMap((projection) => projection.missingDomainFieldNames))];
  const incompleteDomainFields = [...new Set(projections.flatMap((projection) => projection.incompleteDomainFieldNames))];
  const missingAverageSizeFields = [...new Set(projections.flatMap((projection) => projection.missingAverageSizeFieldNames))];
  const hasIncompleteEstimate = missingDomainFields.length > 0 || incompleteDomainFields.length > 0 || missingAverageSizeFields.length > 0;
  function update(patch: Partial<VolumeEstimate>) {
    onChange({ ...estimate, ...patch });
  }
  const handleInitialCountChange = (event: ChangeEvent<HTMLInputElement>) => update({ initialRecordCount: Math.max(0, Number(event.target.value)) });
  const handleGrowthAmountChange = (event: ChangeEvent<HTMLInputElement>) => update({ growthRate: { ...estimate.growthRate, amount: Math.max(0, Number(event.target.value)) } });
  const handleGrowthPeriodChange = (event: ChangeEvent<HTMLSelectElement>) => update({ growthRate: { ...estimate.growthRate, period: event.target.value as EstimatePeriod } });
  function handleRetentionValueChange(event: ChangeEvent<HTMLInputElement>) {
    const unit = estimate.retentionPeriod?.unit ?? "year";
    update({ retentionPeriod: { value: Math.min(retentionValueMax(unit), Math.max(1, Math.round(Number(event.target.value)))), unit } });
  }
  function handleRetentionUnitChange(event: ChangeEvent<HTMLSelectElement>) {
    const unit = event.target.value as DurationUnit;
    update({ retentionPeriod: { value: Math.min(retentionValueMax(unit), estimate.retentionPeriod?.value ?? 3), unit } });
  }
  const handleMaximumCountChange = (event: ChangeEvent<HTMLInputElement>) => update({ maximumRecordCount: event.target.value === "" ? undefined : Math.max(0, Number(event.target.value)) });

  return (
    <div className="grid min-h-full grid-cols-[320px_1fr]">
      <aside className="border-r border-slate-200 bg-slate-50 p-5">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Model inputs</p>
        <fieldset disabled={!canEdit} className="disabled-controls mt-4 space-y-4">
          <label className="block"><span className="text-sm font-bold text-slate-700">Initial record count</span><input type="number" min={0} step={1} className="input input-bordered mt-1 w-full bg-white" value={estimate.initialRecordCount} onChange={handleInitialCountChange}/></label>
          <div><span className="text-sm font-bold text-slate-700">{model.role === "transaction" ? "Expected inserts" : "Expected net increase"}</span><div className="mt-1 grid grid-cols-[1fr_110px] gap-2"><input type="number" min={0} step={1} className="input input-bordered bg-white" value={estimate.growthRate.amount} onChange={handleGrowthAmountChange}/><select className="select select-bordered bg-white" value={estimate.growthRate.period} onChange={handleGrowthPeriodChange}><option value="hour">per hour</option><option value="day">per day</option><option value="month">per month</option></select></div></div>
          {model.role === "transaction" && <div className="rounded-lg border border-blue-200 bg-blue-50 p-3"><span className="text-sm font-bold text-blue-950">Retention period</span><div className="mt-2 grid grid-cols-[1fr_110px] gap-2"><input type="number" min={1} max={retentionValueMax(estimate.retentionPeriod?.unit ?? "year")} step={1} className="input input-bordered bg-white" value={estimate.retentionPeriod?.value ?? 3} required onChange={handleRetentionValueChange}/><select className="select select-bordered bg-white" value={estimate.retentionPeriod?.unit ?? "year"} onChange={handleRetentionUnitChange}><option value="hour">hours</option><option value="day">days</option><option value="month">months</option><option value="year">years</option></select></div><p className="mt-2 text-[11px] text-blue-800">Required per model. Maximum: 31 days, 12 months, or 30 years. Unlimited retention is not available.</p></div>}
          <label className="block"><span className="text-sm font-bold text-slate-700">Maximum record count <span className="font-normal text-slate-400">(optional)</span></span><input type="number" min={0} step={1} className="input input-bordered mt-1 w-full bg-white" value={estimate.maximumRecordCount ?? ""} onChange={handleMaximumCountChange}/></label>
        </fieldset>
        <div className="mt-5 rounded-lg bg-white p-3 text-[11px] leading-5 text-slate-600"><p className="font-bold text-slate-800">Assumptions</p><p>Month = 30.4375 days; year = 365.25 days.</p>{model.role === "transaction" && <p>Initial records are uniformly aged across this model’s retention window. Expired rows are excluded.</p>}<p>Generic row/index overhead is 20%; index pointer is 8 bytes.</p><p>Logs, backups, replicas, bloat, temporary space, and expired-row destinations are excluded.</p></div>
      </aside>
      <section className="p-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{projections.map((projection, index) => <article key={`${projection.horizon.unit}:${projection.horizon.value}`} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{projection.horizon.label}</p>{model.role === "transaction" && index === projections.length - 1 && <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-blue-600">Retention limit</p>}<p className="mt-2 text-2xl font-black tabular-nums text-slate-950">{projection.recordCount.toLocaleString()}</p><p className="text-xs text-slate-500">retained records</p><div className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-xs"><p className="flex justify-between gap-3"><span>Table</span><strong>{formatBytes(projection.tableBytes)}</strong></p><p className="flex justify-between gap-3"><span>Indexes</span><strong>{formatBytes(projection.indexBytes)}</strong></p><p className="flex justify-between gap-3 text-emerald-800"><span>Total</span><strong>{formatBytes(projection.totalBytes)}</strong></p></div></article>)}</div>
        <div className="mt-5 grid gap-4 md:grid-cols-2"><article className="rounded-xl border border-slate-200 p-4"><div className="flex items-center gap-2"><Database size={17} className="text-blue-700"/><h3 className="font-bold">Average record size</h3></div><p className="mt-3 text-3xl font-black">{formatBytes(projections[0]?.recordSizeBytes ?? 0)}</p><p className="mt-1 text-xs text-slate-500">Payload {formatBytes(projections[0]?.recordPayloadBytes ?? 0)} + generic overhead</p></article><article className="rounded-xl border border-slate-200 p-4"><div className="flex items-center gap-2"><HardDrive size={17} className="text-emerald-700"/><h3 className="font-bold">Index structures</h3></div><p className="mt-3 text-3xl font-black">{indexStructures.explicit + indexStructures.implicit}</p><p className="mt-1 text-xs text-slate-500">{indexStructures.explicit} configured + {indexStructures.implicit} from PK/UNIQUE</p></article></div>
        {hasIncompleteEstimate && <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"><p className="font-bold">Incomplete field-size estimate</p><div className="mt-1 space-y-1 text-xs">{missingDomainFields.length > 0 && <p>{`Set a domain for: ${missingDomainFields.join(", ")}.`}</p>}{incompleteDomainFields.length > 0 && <p>{`Complete the domain definition for: ${incompleteDomainFields.join(", ")}.`}</p>}{missingAverageSizeFields.length > 0 && <p>{`Set estimated average size for: ${missingAverageSizeFields.join(", ")}.`}</p>}<p>Unknown sizes are not silently counted as zero; totals above are incomplete.</p></div></div>}
      </section>
    </div>
  );
}
