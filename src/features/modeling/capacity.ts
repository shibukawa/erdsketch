import type { DataDomain, DurationUnit, ModelField, ModelSeed, PrimitiveType, RetentionPeriod, VolumeEstimate } from "./types";

export type ProjectionHorizon = { label: string; value: number; unit: DurationUnit };

export type CapacityProjection = {
  horizon: ProjectionHorizon;
  recordCount: number;
  recordPayloadBytes: number;
  recordSizeBytes: number;
  tableBytes: number;
  indexBytes: number;
  totalBytes: number;
  missingFieldNames: string[];
};

export const defaultProjectionHorizons: ProjectionHorizon[] = [
  { label: "Now", value: 0, unit: "day" },
  { label: "1 month", value: 1, unit: "month" },
  { label: "1 year", value: 1, unit: "year" },
  { label: "3 years", value: 3, unit: "year" }
];

export function retentionValueMax(unit: DurationUnit) {
  switch (unit) {
    case "hour": return 24;
    case "day": return 31;
    case "month": return 12;
    case "year": return 30;
  }
}

function retentionHorizonLabel(value: number, unit: DurationUnit) {
  return `${value} ${unit}${value === 1 ? "" : "s"}`;
}

function retentionHorizon(value: number, unit: DurationUnit): ProjectionHorizon {
  return { label: retentionHorizonLabel(value, unit), value, unit };
}

export function projectionHorizonsForModel(seed: ModelSeed): ProjectionHorizon[] {
  if (seed.role !== "transaction") return defaultProjectionHorizons;
  const retention = normalizeTransactionRetention(seed.role, seed.volumeEstimate?.retentionPeriod) ?? { value: 3, unit: "year" as const };
  const value = retention.value;
  const now: ProjectionHorizon = { label: "Now", value: 0, unit: "day" };

  switch (retention.unit) {
    case "year":
      return [now, retentionHorizon(1, "month"), retentionHorizon(1, "year"), ...(value > 1 ? [retentionHorizon(value, "year")] : [])];
    case "month": {
      if (value === 3) return [now, retentionHorizon(1, "month"), retentionHorizon(2, "month"), retentionHorizon(3, "month")];
      const values = [1, 3, value].filter((candidate, index, all) => candidate <= value && all.indexOf(candidate) === index);
      return [now, ...values.map((candidate) => retentionHorizon(candidate, "month"))];
    }
    case "day": {
      const values = [1, 7, value].filter((candidate, index, all) => candidate <= value && all.indexOf(candidate) === index);
      return [now, ...values.map((candidate) => retentionHorizon(candidate, "day"))];
    }
    case "hour": {
      const values = [1, 6, value].filter((candidate, index, all) => candidate <= value && all.indexOf(candidate) === index);
      return [now, ...values.map((candidate) => retentionHorizon(candidate, "hour"))];
    }
  }
}

export function defaultVolumeEstimate(role: ModelSeed["role"]): VolumeEstimate {
  return {
    initialRecordCount: 0,
    growthRate: { amount: 0, period: "day" },
    retentionPeriod: role === "transaction" ? { value: 3, unit: "year" } : undefined
  };
}

export function durationHours(value: number, unit: DurationUnit) {
  switch (unit) {
    case "hour": return value;
    case "day": return value * 24;
    case "month": return value * 24 * 30.4375;
    case "year": return value * 24 * 365.25;
  }
}

function ratePerHour(volume: VolumeEstimate) {
  return volume.growthRate.amount / durationHours(1, volume.growthRate.period);
}

export function estimateRecordCount(role: ModelSeed["role"], volume: VolumeEstimate, horizon: ProjectionHorizon) {
  const horizonHours = durationHours(horizon.value, horizon.unit);
  const rate = ratePerHour(volume);
  let count: number;
  if (role === "transaction") {
    const retention = volume.retentionPeriod ?? { value: 3, unit: "year" as const };
    const retentionHours = Math.max(1, durationHours(retention.value, retention.unit));
    const existingSurvivors = volume.initialRecordCount * Math.max(0, 1 - horizonHours / retentionHours);
    const newSurvivors = rate * Math.min(horizonHours, retentionHours);
    count = existingSurvivors + newSurvivors;
  } else {
    count = volume.initialRecordCount + rate * horizonHours;
  }
  if (volume.maximumRecordCount !== undefined) count = Math.min(count, volume.maximumRecordCount);
  return Math.max(0, Math.ceil(count));
}

function domainByID(domainId: string | undefined, domains: DataDomain[]) {
  return domains.find((domain) => domain.id === domainId);
}

function primitiveSize(type: PrimitiveType | undefined, domain: DataDomain | undefined): number | undefined {
  switch (type) {
    case "integer": return (domain?.bits ?? 32) / 8;
    case "decimal": return Math.max(4, Math.ceil((domain?.precision ?? 18) / 2) + 1);
    case "floating_point": return (domain?.bits ?? 64) / 8;
    case "date": return 4;
    case "time": return 8;
    case "datetime": return 8;
    case "datetime_with_timezone": return 12;
    case "boolean": return 1;
    case "uuid": return 16;
    case "varchar": return domain?.length ? domain.length / 2 : undefined;
    case "code_set":
      if (domain?.codeSetBaseType === "integer") return 4;
      if (domain?.codeSetBaseType === "decimal") return 8;
      return domain?.length ? domain.length / 2 : undefined;
    case "text":
    case "blob":
    default:
      return undefined;
  }
}

function resolvedDomain(domainId: string | undefined, domains: DataDomain[], seen = new Set<string>()): DataDomain | undefined {
  const domain = domainByID(domainId, domains);
  if (!domain || seen.has(domain.id)) return domain;
  if (domain.primitiveType) return domain;
  seen.add(domain.id);
  if (domain.shape === "scalar" && domain.components.length === 1) return resolvedDomain(domain.components[0].domainId, domains, seen);
  return domain;
}

export function effectivePrimitiveType(field: ModelField, domains: DataDomain[]) {
  return resolvedDomain(field.domainId, domains)?.primitiveType;
}

function fieldAverageSize(field: ModelField, domains: DataDomain[]): { bytes: number; missing: boolean } {
  if (field.estimatedAverageSizeBytes !== undefined) return { bytes: Math.max(0, field.estimatedAverageSizeBytes), missing: false };
  const domain = resolvedDomain(field.domainId, domains);
  if (!domain) return { bytes: 0, missing: true };
  if (domain.shape === "composite") {
    return domain.components.reduce<{ bytes: number; missing: boolean }>((total, component) => {
      const componentDomain = resolvedDomain(component.domainId, domains);
      const bytes = primitiveSize(componentDomain?.primitiveType, componentDomain);
      return { bytes: total.bytes + (bytes ?? 0), missing: total.missing || bytes === undefined };
    }, { bytes: 0, missing: false });
  }
  const bytes = primitiveSize(domain.primitiveType, domain);
  return { bytes: bytes ?? 0, missing: bytes === undefined };
}

function fieldIndexKeySize(field: ModelField, componentId: string | undefined, domains: DataDomain[]) {
  if (!componentId) return fieldAverageSize(field, domains).bytes;
  const domain = domainByID(field.domainId, domains);
  const component = domain?.components.find((candidate) => candidate.id === componentId);
  if (!component) return 0;
  const componentDomain = resolvedDomain(component.domainId, domains);
  return primitiveSize(componentDomain?.primitiveType, componentDomain) ?? 0;
}

function indexStorageBytes(recordCount: number, keyBytes: number) {
  return recordCount * (keyBytes + 8) * 1.2;
}

export function indexStructureCount(seed: ModelSeed) {
  const primaryKeyCount = seed.fields.some((field) => field.primaryKey) ? 1 : 0;
  const uniqueCount = seed.fields.filter((field) => field.unique && !field.primaryKey).length;
  return { explicit: (seed.indexes ?? []).length, implicit: primaryKeyCount + uniqueCount };
}

export function estimateCapacity(seed: ModelSeed, domains: DataDomain[], horizon: ProjectionHorizon): CapacityProjection {
  const volume = seed.volumeEstimate ?? defaultVolumeEstimate(seed.role);
  const sizes = seed.fields.map((field) => ({ field, ...fieldAverageSize(field, domains) }));
  const missingFieldNames = sizes.filter((item) => item.missing).map((item) => item.field.name);
  const recordPayloadBytes = sizes.reduce((sum, item) => sum + item.bytes, 0);
  const recordSizeBytes = recordPayloadBytes * 1.2;
  const recordCount = estimateRecordCount(seed.role, volume, horizon);
  const tableBytes = recordCount * recordSizeBytes;
  const fieldByID = new Map(seed.fields.map((field) => [field.id, field]));
  const explicitIndexBytes = (seed.indexes ?? []).reduce((total, index) => {
    const keyBytes = index.keys.reduce((sum, key) => {
      if (key.source === "relationship") return sum + 8;
      const field = fieldByID.get(key.sourceId);
      return sum + (field ? fieldIndexKeySize(field, key.componentId, domains) : 0);
    }, 0);
    return total + indexStorageBytes(recordCount, keyBytes);
  }, 0);
  const primaryKeyFields = seed.fields.filter((field) => field.primaryKey);
  const primaryKeyBytes = primaryKeyFields.reduce((sum, field) => sum + fieldIndexKeySize(field, undefined, domains), 0);
  const primaryKeyIndexBytes = primaryKeyFields.length > 0 ? indexStorageBytes(recordCount, primaryKeyBytes) : 0;
  const uniqueIndexBytes = seed.fields.filter((field) => field.unique && !field.primaryKey).reduce((total, field) => total + indexStorageBytes(recordCount, fieldIndexKeySize(field, undefined, domains)), 0);
  const indexBytes = explicitIndexBytes + primaryKeyIndexBytes + uniqueIndexBytes;
  return { horizon, recordCount, recordPayloadBytes, recordSizeBytes, tableBytes, indexBytes, totalBytes: tableBytes + indexBytes, missingFieldNames };
}

export function formatBytes(bytes: number) {
  const units = ["B", "KiB", "MiB", "GiB", "TiB"];
  let value = Math.max(0, bytes);
  let unit = units[0];
  for (let index = 1; index < units.length && value >= 1024; index += 1) {
    value /= 1024;
    unit = units[index];
  }
  return `${value >= 100 || unit === "B" ? value.toFixed(0) : value.toFixed(1)} ${unit}`;
}

export function normalizeTransactionRetention(role: ModelSeed["role"], retention: RetentionPeriod | undefined) {
  if (role !== "transaction") return retention;
  if (!retention || retention.value <= 0) return { value: 3, unit: "year" as const };
  return { ...retention, value: Math.min(retentionValueMax(retention.unit), Math.max(1, Math.round(retention.value))) };
}
