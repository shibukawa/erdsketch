import type { DataDomain, ModelSeed, NameDisplayMode, NameSet, NamingPolicy, VocabularyBinding, VocabularyEntry, VocabularySegment } from "./types";
import { getDisplayName, toSnakeCase } from "./utils.ts";

export type VocabularyTarget = "table" | "field" | "domain";
export type VocabularyStatus = "unmatched" | "correction_required" | "incomplete" | "complete";
export type VocabularyDisplaySegment = { text: string; state: "resolved" | "unmatched" | "alias" | "missing" };
export type VocabularyAliasMatch = { segmentIndex: number; entryId: string; alias: string; preferred: string };

export type VocabularySource = {
  key: string;
  target: VocabularyTarget;
  ownerId: string;
  fieldId?: string;
  ownerLabel: string;
  sourceText: string;
  binding?: VocabularyBinding;
};

export type VocabularyMatch = VocabularySource & {
  names: NameSet;
  binding: VocabularyBinding;
  entryIds: string[];
  unmatched: string[];
  aliasMatches: VocabularyAliasMatch[];
  displaySegments: Record<NameDisplayMode, VocabularyDisplaySegment[]>;
  status: VocabularyStatus;
};

export type VocabularyIndicators = {
  unregistered: boolean;
  aliasMatch: boolean;
  missingSystemName: boolean;
  missingPhysicalName: boolean;
  complete: boolean;
};

export type VocabularyPrimaryIndicator = keyof VocabularyIndicators;
export type VocabularyAutofillTarget = "system" | "physical";

export type VocabularyMatchCache = {
  matches: Map<string, VocabularyMatch>;
  entryUsage: Map<string, string[]>;
  builtAt: number;
};

export function getVocabularyIndicators(match: VocabularyMatch): VocabularyIndicators {
  const unregistered = match.unmatched.length > 0;
  const aliasMatch = match.aliasMatches.length > 0;
  const missingSystemName = match.displaySegments.system.some((segment) => segment.state === "missing");
  const missingPhysicalName = match.displaySegments.physical.some((segment) => segment.state === "missing");
  return {
    unregistered,
    aliasMatch,
    missingSystemName,
    missingPhysicalName,
    complete: !unregistered && !aliasMatch && !missingSystemName && !missingPhysicalName
  };
}

export function getPrimaryVocabularyIndicator(match: VocabularyMatch): VocabularyPrimaryIndicator {
  const indicators = getVocabularyIndicators(match);
  if (indicators.unregistered) return "unregistered";
  if (indicators.missingSystemName) return "missingSystemName";
  if (indicators.missingPhysicalName) return "missingPhysicalName";
  if (indicators.aliasMatch) return "aliasMatch";
  return "complete";
}

export function fillMissingVocabularyName(entry: VocabularyEntry, target: VocabularyAutofillTarget): VocabularyEntry {
  if (target === "system") {
    if (entry.systemName.trim()) return entry;
    return { ...entry, systemName: entry.businessName.trim() };
  }
  if (entry.physicalName.trim()) return entry;
  return { ...entry, physicalName: toSnakeCase(entry.businessName) };
}

export function getCachedDisplayName(cache: VocabularyMatchCache, key: string, legacyName: string, names: NameSet | undefined, mode: NameDisplayMode) {
  return cache.matches.get(key)?.names[mode] || getDisplayName(legacyName, names, mode);
}

const defaultPolicy: NamingPolicy = {
  tablePluralization: "singular",
  tableJoinMode: "separator", tableSeparator: "_",
  fieldJoinMode: "separator", fieldSeparator: "_",
  domainJoinMode: "concatenate", domainSeparator: "_"
};

export function normalizeNamingPolicy(policy?: Partial<NamingPolicy>): NamingPolicy {
  return { ...defaultPolicy, ...policy };
}

export function collectVocabularySources(seeds: ModelSeed[], domains: DataDomain[]): VocabularySource[] {
  return [
    ...seeds.flatMap((seed) => {
      const tableSource = seed.names?.business || seed.title;
      return [
        { key: `table:${seed.id}`, target: "table" as const, ownerId: seed.id, ownerLabel: tableSource, sourceText: tableSource, binding: seed.vocabularyBinding },
        ...(seed.fields ?? []).map((field) => {
          const sourceText = field.names?.business || field.name;
          return { key: `field:${seed.id}:${field.id}`, target: "field" as const, ownerId: seed.id, fieldId: field.id, ownerLabel: sourceText, sourceText, binding: field.vocabularyBinding };
        })
      ];
    }),
    ...domains.filter((domain) => !domain.system).map((domain) => {
      const sourceText = domain.names?.business || domain.name;
      return { key: `domain:${domain.id}`, target: "domain" as const, ownerId: domain.id, ownerLabel: sourceText, sourceText, binding: domain.vocabularyBinding };
    })
  ];
}

function vocabularyCandidates(entries: VocabularyEntry[]) {
  return entries.flatMap((entry, entryIndex) => [entry.businessName, ...entry.aliases].filter(Boolean).map((term, termIndex) => ({ entry, entryIndex, term, termIndex, matchKind: termIndex === 0 ? "preferred" as const : "alias" as const })))
    .sort((left, right) => right.term.length - left.term.length || left.entryIndex - right.entryIndex || left.termIndex - right.termIndex);
}

export function resolveVocabularyBinding(sourceText: string, entries: VocabularyEntry[]): VocabularyBinding {
  const candidates = vocabularyCandidates(entries);
  const lower = sourceText.toLocaleLowerCase();
  const segments: VocabularySegment[] = [];
  let offset = 0;
  let unmatched = "";
  const flushUnmatched = () => {
    if (unmatched) segments.push({ type: "unmatched", text: unmatched });
    unmatched = "";
  };
  while (offset < sourceText.length) {
    const match = candidates.find((candidate) => lower.startsWith(candidate.term.toLocaleLowerCase(), offset));
    if (!match) {
      unmatched += sourceText[offset];
      offset += 1;
      continue;
    }
    flushUnmatched();
    const source = sourceText.slice(offset, offset + match.term.length);
    segments.push({ type: "entry", entryId: match.entry.id, source, matchKind: match.matchKind });
    offset += match.term.length;
  }
  flushUnmatched();
  return { sourceText, segments, manual: false };
}

function joinPhysical(parts: string[], target: VocabularyTarget, policy: NamingPolicy) {
  const mode = policy[`${target}JoinMode` as "tableJoinMode"];
  const separator = mode === "concatenate" ? "" : policy[`${target}Separator` as "tableSeparator"];
  let value = parts.filter(Boolean).map(toSnakeCase).filter(Boolean).join(separator);
  if (target === "table" && policy.tablePluralization === "plural") value = applyTablePluralization(value, true);
  return value;
}

function isMeaningfulUnmatched(text: string) {
  return /[\p{L}\p{N}]/u.test(text);
}

export function materializeVocabularyMatch(source: VocabularySource, entries: VocabularyEntry[], policyInput?: Partial<NamingPolicy>): VocabularyMatch {
  const policy = normalizeNamingPolicy(policyInput);
  const entryById = new Map(entries.map((entry) => [entry.id, entry]));
  const binding = source.binding?.sourceText === source.sourceText ? source.binding : resolveVocabularyBinding(source.sourceText, entries);
  const matchedEntries = binding.segments.flatMap((segment) => segment.type === "entry" && entryById.has(segment.entryId) ? [entryById.get(segment.entryId)!] : []);
  const unmatched = binding.segments.flatMap((segment) => segment.type === "unmatched" && isMeaningfulUnmatched(segment.text) ? [segment.text] : []);
  const aliasMatches = binding.segments.flatMap((segment, segmentIndex) => {
    if (segment.type !== "entry") return [];
    const entry = entryById.get(segment.entryId);
    const matchKind = segment.matchKind ?? (entry && segment.source.localeCompare(entry.businessName, undefined, { sensitivity: "accent" }) === 0 ? "preferred" : "alias");
    return matchKind === "alias" && entry ? [{ segmentIndex, entryId: entry.id, alias: segment.source, preferred: entry.businessName }] : [];
  });
  const missingEntry = binding.segments.some((segment) => segment.type === "entry" && !entryById.has(segment.entryId));
  const incomplete = matchedEntries.some((entry) => !entry.systemName || !entry.physicalName);
  const displaySegments = binding.segments.reduce<Record<NameDisplayMode, VocabularyDisplaySegment[]>>((result, segment) => {
    if (segment.type === "unmatched") {
      if (isMeaningfulUnmatched(segment.text)) {
        for (const mode of ["business", "system", "physical"] as NameDisplayMode[]) result[mode].push({ text: segment.text, state: "unmatched" });
      } else {
        result.business.push({ text: segment.text, state: "resolved" });
        result.system.push({ text: segment.text.replace(/[_-]+/g, " "), state: "resolved" });
      }
      return result;
    }
    const entry = entryById.get(segment.entryId);
    const isAlias = segment.matchKind === "alias" || (!segment.matchKind && entry && segment.source.localeCompare(entry.businessName, undefined, { sensitivity: "accent" }) !== 0);
    result.business.push({ text: segment.source, state: isAlias ? "alias" : "resolved" });
    result.system.push({ text: entry?.systemName || segment.source, state: !entry?.systemName ? "missing" : isAlias ? "alias" : "resolved" });
    result.physical.push({ text: entry?.physicalName || segment.source, state: !entry?.physicalName ? "missing" : isAlias ? "alias" : "resolved" });
    return result;
  }, { business: [], system: [], physical: [] });
  const joinMode = policy[`${source.target}JoinMode` as "tableJoinMode"];
  const separator = joinMode === "concatenate" ? "" : policy[`${source.target}Separator` as "tableSeparator"];
  const physicalSegments = displaySegments.physical.filter((segment) => segment.text);
  displaySegments.physical = physicalSegments.flatMap((segment, index) => index === 0 || !separator || segment.state === "unmatched" || physicalSegments[index - 1].state === "unmatched" ? [segment] : [{ text: separator, state: "resolved" as const }, segment]);
  if (source.target === "table" && policy.tablePluralization === "plural") {
    let lastResolved = -1;
    for (let index = displaySegments.physical.length - 1; index >= 0; index -= 1) {
      const segment = displaySegments.physical[index];
      if (segment.state !== "unmatched" && segment.state !== "missing" && segment.text !== separator) { lastResolved = index; break; }
    }
    if (lastResolved >= 0) displaySegments.physical[lastResolved] = { ...displaySegments.physical[lastResolved], text: applyTablePluralization(toSnakeCase(displaySegments.physical[lastResolved].text), true) };
  }
  const physicalParts = binding.segments.flatMap((segment) => segment.type === "entry" ? [entryById.get(segment.entryId)?.physicalName || ""] : []);
  const physicalName = joinPhysical(physicalParts, source.target, policy);
  const status: VocabularyStatus = unmatched.length > 0 || missingEntry ? "unmatched" : aliasMatches.length > 0 ? "correction_required" : incomplete ? "incomplete" : "complete";
  return {
    ...source,
    binding,
    names: { business: source.sourceText, system: displaySegments.system.map((segment) => segment.text).join(""), physical: physicalName },
    entryIds: [...new Set(matchedEntries.map((entry) => entry.id))],
    unmatched,
    aliasMatches,
    displaySegments,
    status
  };
}

export function replaceAliasInSource(match: VocabularyMatch, segmentIndex: number) {
  return match.binding.segments.map((segment, index) => index === segmentIndex && segment.type === "entry"
    ? match.aliasMatches.find((alias) => alias.segmentIndex === segmentIndex)?.preferred ?? segment.source
    : segment.type === "entry" ? segment.source : segment.text).join("");
}

export function vocabularyTermConflict(entries: VocabularyEntry[], next: VocabularyEntry) {
  const normalized = (value: string) => value.trim().toLocaleLowerCase();
  const claimed = new Map<string, { entryId: string; term: string }>();
  for (const entry of entries) {
    if (entry.id === next.id) continue;
    for (const term of [entry.businessName, ...entry.aliases]) if (normalized(term) && !claimed.has(normalized(term))) claimed.set(normalized(term), { entryId: entry.id, term });
  }
  const own = new Set<string>();
  for (const term of [next.businessName, ...next.aliases]) {
    const key = normalized(term);
    if (!key) continue;
    if (own.has(key)) return term;
    own.add(key);
    if (claimed.has(key)) return term;
  }
  return null;
}

export function buildVocabularyMatchCache(seeds: ModelSeed[], domains: DataDomain[], entries: VocabularyEntry[], policy?: Partial<NamingPolicy>): VocabularyMatchCache {
  const matches = new Map<string, VocabularyMatch>();
  const entryUsage = new Map<string, string[]>();
  for (const source of collectVocabularySources(seeds, domains)) {
    const match = materializeVocabularyMatch(source, entries, policy);
    matches.set(source.key, match);
    for (const entryId of match.entryIds) entryUsage.set(entryId, [...(entryUsage.get(entryId) ?? []), source.key]);
  }
  return { matches, entryUsage, builtAt: Date.now() };
}

export function deterministicSuggestion(business: string): { system: string; physical: string } {
  return { system: business.trim(), physical: toSnakeCase(business) };
}

export function applyTablePluralization(physical: string, plural: boolean) {
  if (!plural || !physical || physical.endsWith("s")) return physical;
  if (physical.endsWith("y") && !/[aeiou]y$/.test(physical)) return `${physical.slice(0, -1)}ies`;
  if (/(s|x|z|ch|sh)$/.test(physical)) return `${physical}es`;
  return `${physical}s`;
}
