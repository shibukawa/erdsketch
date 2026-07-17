import type { DataDomain, ModelSeed, VocabularyBinding, VocabularyEntry } from "./types";
import { resolveVocabularyBinding } from "./vocabulary.ts";

export const defaultModelDescription = "A rough model idea. Drag it near related seeds and rename it when it gets clearer.";

export type ModelMaturityStage = "seed" | "concept" | "logical" | "matured";
export type ModelMaturityIssue = {
  id: string;
  kind: "default-model-name" | "default-model-description" | "missing-primary-key" | "missing-domain" | "missing-vocabulary-name";
  label: string;
  detail: string;
  target: "model" | "field" | "domain" | "vocabulary";
  fieldId?: string;
  actionKey?: string;
};

export type ModelMaturityAssessment = {
  stage: ModelMaturityStage;
  maturedLevel: 0.5 | 1.25 | 3.5 | 6;
  nextStage?: Exclude<ModelMaturityStage, "seed">;
  issues: ModelMaturityIssue[];
};

function isDefaultModelName(seed: ModelSeed) {
  const businessName = seed.names?.business?.trim() || seed.title.trim();
  return !businessName || /^Model Seed \d+$/i.test(businessName);
}

function bindingEntryIds(sourceText: string, binding: VocabularyBinding | undefined, entries: VocabularyEntry[]) {
  const resolved = binding?.sourceText === sourceText ? binding : resolveVocabularyBinding(sourceText, entries);
  const known = new Set(entries.map((entry) => entry.id));
  return [...new Set(resolved.segments.flatMap((segment) => segment.type === "entry" && known.has(segment.entryId) ? [segment.entryId] : []))];
}

export function assessModelMaturity(seed: ModelSeed, domains: DataDomain[], vocabularyEntries: VocabularyEntry[]): ModelMaturityAssessment {
  const seedIssues: ModelMaturityIssue[] = [];
  if (isDefaultModelName(seed)) seedIssues.push({ id: `${seed.id}:default-name`, kind: "default-model-name", label: seed.title, detail: "Change the default model name.", target: "model" });
  if (seed.description === defaultModelDescription) seedIssues.push({ id: `${seed.id}:default-description`, kind: "default-model-description", label: seed.title, detail: "Change the default model description.", target: "model" });
  if (!seed.fields.some((field) => field.primaryKey)) seedIssues.push({ id: `${seed.id}:primary-key`, kind: "missing-primary-key", label: seed.title, detail: "Select at least one primary-key field.", target: "field" });
  if (seedIssues.length > 0) return { stage: "seed", maturedLevel: 6, nextStage: "concept", issues: seedIssues };

  const conceptIssues = seed.fields.flatMap<ModelMaturityIssue>((field) => field.domainId ? [] : [{
    id: `${seed.id}:${field.id}:domain`, kind: "missing-domain", label: field.names?.business || field.name,
    detail: "Assign a domain to this field.", target: "field", fieldId: field.id
  }]);
  if (conceptIssues.length > 0) return { stage: "concept", maturedLevel: 3.5, nextStage: "logical", issues: conceptIssues };

  const entryById = new Map(vocabularyEntries.map((entry) => [entry.id, entry]));
  const assignedDomains = [...new Set(seed.fields.flatMap((field) => field.domainId ? [field.domainId] : []))]
    .flatMap((domainId) => domains.find((domain) => domain.id === domainId) ?? []);
  const sources = [
    { key: `model:${seed.id}`, label: seed.names?.business || seed.title, target: "model" as const, sourceText: seed.names?.business || seed.title, binding: seed.vocabularyBinding },
    ...seed.fields.map((field) => ({ key: `field:${field.id}`, label: field.names?.business || field.name, target: "field" as const, sourceText: field.names?.business || field.name, binding: field.vocabularyBinding })),
    ...assignedDomains.map((domain) => ({ key: `domain:${domain.id}`, label: domain.names?.business || domain.name, target: "domain" as const, sourceText: domain.names?.business || domain.name, binding: domain.vocabularyBinding }))
  ];
  const logicalIssues = sources.flatMap((source) => bindingEntryIds(source.sourceText, source.binding, vocabularyEntries).flatMap<ModelMaturityIssue>((entryId) => {
    const entry = entryById.get(entryId);
    if (!entry) return [];
    return [
      ...(!entry.systemName.trim() ? [{ id: `${source.key}:${entry.id}:system`, kind: "missing-vocabulary-name" as const, label: source.label, detail: `Vocabulary “${entry.businessName}” needs a system name.`, target: "vocabulary" as const, actionKey: source.key.replace(/^model:/, "table:") }] : []),
      ...(!entry.physicalName.trim() ? [{ id: `${source.key}:${entry.id}:physical`, kind: "missing-vocabulary-name" as const, label: source.label, detail: `Vocabulary “${entry.businessName}” needs a physical name.`, target: "vocabulary" as const, actionKey: source.key.replace(/^model:/, "table:") }] : [])
    ];
  }));
  if (logicalIssues.length > 0) return { stage: "logical", maturedLevel: 1.25, nextStage: "matured", issues: logicalIssues };
  return { stage: "matured", maturedLevel: 0.5, issues: [] };
}

export function applyAutomaticMaturity(seeds: ModelSeed[], domains: DataDomain[], vocabularyEntries: VocabularyEntry[]) {
  return seeds.map((seed) => {
    const maturedLevel = assessModelMaturity(seed, domains, vocabularyEntries).maturedLevel;
    return seed.maturedLevel === maturedLevel ? seed : { ...seed, maturedLevel };
  });
}
