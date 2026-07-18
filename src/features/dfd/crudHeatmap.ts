import { durationHours, estimateCapacity, projectionHorizonsForModel } from "../modeling/capacity.ts";
import type { DataDomain, ModelSeed } from "../modeling/types";

export type CrudHeatmapBasis = "record_count" | "storage_size";

export type CrudHeatmapMetric = {
  available: boolean;
  value: number | null;
  score: number | null;
  weight: number;
  percentage: number | null;
};

export type CrudHeatmap = {
  models: Map<string, CrudHeatmapMetric>;
  processes: Map<string, CrudHeatmapMetric>;
};

type RawMetric = { value: number; score: number } | null;

function latestProjection(model: ModelSeed, domains: DataDomain[]) {
  const horizons = projectionHorizonsForModel(model);
  const horizon = horizons.reduce((latest, candidate) => durationHours(candidate.value, candidate.unit) > durationHours(latest.value, latest.unit) ? candidate : latest);
  return estimateCapacity(model, domains, horizon);
}

function modelMetric(model: ModelSeed, domains: DataDomain[], basis: CrudHeatmapBasis): RawMetric {
  const projection = latestProjection(model, domains);
  if (basis === "storage_size" && projection.missingFieldNames.length > 0) return null;
  const value = basis === "record_count" ? projection.recordCount : projection.totalBytes;
  if (!Number.isFinite(value) || value < 0) return null;
  return { value, score: Math.log10(1 + value) };
}

function productLogScore(values: number[]) {
  if (values.length === 0 || values.some((value) => value === 0)) return 0;
  const logProduct = values.reduce((total, value) => total + Math.log10(value), 0);
  return logProduct > 0
    ? logProduct + Math.log10(1 + 10 ** -logProduct)
    : Math.log10(1 + 10 ** logProduct);
}

function normalize(metrics: Map<string, RawMetric>): Map<string, CrudHeatmapMetric> {
  const scores = [...metrics.values()].flatMap((metric) => metric ? [metric.score] : []);
  const minimum = scores.length > 0 ? Math.min(...scores) : 0;
  const maximum = scores.length > 0 ? Math.max(...scores) : 0;
  const range = maximum - minimum;
  const normalized = new Map<string, CrudHeatmapMetric>();
  for (const [id, metric] of metrics) {
    if (!metric) {
      normalized.set(id, { available: false, value: null, score: null, weight: 0, percentage: null });
      continue;
    }
    const weight = range > 0 ? (metric.score - minimum) / range : 0;
    normalized.set(id, { available: true, value: metric.value, score: metric.score, weight, percentage: Math.round(100 * weight) });
  }
  return normalized;
}

export function calculateCrudHeatmap(
  models: ModelSeed[],
  domains: DataDomain[],
  processIds: string[],
  readModelIdsByProcess: ReadonlyMap<string, ReadonlySet<string>>,
  basis: CrudHeatmapBasis
): CrudHeatmap {
  const rawModels = new Map(models.map((model) => [model.id, modelMetric(model, domains, basis)]));
  const rawProcesses = new Map<string, RawMetric>();

  for (const processId of processIds) {
    const readModelIds = [...(readModelIdsByProcess.get(processId) ?? [])];
    const readMetrics = readModelIds.map((modelId) => rawModels.get(modelId));
    if (readMetrics.some((metric) => metric === null || metric === undefined)) {
      rawProcesses.set(processId, null);
      continue;
    }
    const values = (readMetrics as Array<Exclude<RawMetric, null>>).map((metric) => metric.value);
    const value = values.length === 0 ? 0 : values.reduce((product, item) => product * item, 1);
    rawProcesses.set(processId, { value, score: productLogScore(values) });
  }

  return { models: normalize(rawModels), processes: normalize(rawProcesses) };
}

function channelHex(value: number) {
  return Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0");
}

export function crudHeatmapColor(modelWeight: number, processWeight: number) {
  const model = Math.max(0, Math.min(1, modelWeight));
  const process = Math.max(0, Math.min(1, processWeight));
  const red = 255 * (1 - 0.4 * process);
  const green = 255 * (1 - 0.4 * model) * (1 - 0.4 * process);
  const blue = 255 * (1 - 0.4 * model);
  return `#${channelHex(red)}${channelHex(green)}${channelHex(blue)}`;
}
