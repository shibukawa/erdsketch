import { startTransition, useEffect, useRef, useState } from "react";
import type { DataDomain, ModelSeed, NamingPolicy, VocabularyEntry } from "./types";
import { buildVocabularyMatchCache, collectVocabularySources, materializeVocabularyMatch, type VocabularyMatch, type VocabularyMatchCache } from "./vocabulary";

type CacheInputs = {
  sourceFingerprints: Map<string, string>;
  entryMatchFingerprint: string;
  entryOutputFingerprints: Map<string, string>;
  policyFingerprint: string;
};

function sourceFingerprint(source: ReturnType<typeof collectVocabularySources>[number]) {
  return JSON.stringify([source.sourceText, source.binding]);
}

function captureInputs(seeds: ModelSeed[], domains: DataDomain[], entries: VocabularyEntry[], policy: NamingPolicy): CacheInputs {
  return {
    sourceFingerprints: new Map(collectVocabularySources(seeds, domains).map((source) => [source.key, sourceFingerprint(source)])),
    entryMatchFingerprint: JSON.stringify(entries.map((entry) => [entry.id, entry.businessName, entry.aliases])),
    entryOutputFingerprints: new Map(entries.map((entry) => [entry.id, JSON.stringify([entry.systemName, entry.physicalName])])),
    policyFingerprint: JSON.stringify(policy)
  };
}

function rebuildReverseIndex(matches: Map<string, VocabularyMatch>) {
  const entryUsage = new Map<string, string[]>();
  for (const [key, match] of matches) for (const entryId of match.entryIds) entryUsage.set(entryId, [...(entryUsage.get(entryId) ?? []), key]);
  return entryUsage;
}

export function useVocabularyMatchCache(seeds: ModelSeed[], domains: DataDomain[], entries: VocabularyEntry[], policy: NamingPolicy) {
  const initialCache = useRef<VocabularyMatchCache | null>(null);
  if (!initialCache.current) initialCache.current = buildVocabularyMatchCache(seeds, domains, entries, policy);
  const [cache, setCache] = useState(initialCache.current);
  const [indexing, setIndexing] = useState(false);
  const cacheRef = useRef(cache);
  const previousInputs = useRef(captureInputs(seeds, domains, entries, policy));

  useEffect(() => { cacheRef.current = cache; }, [cache]);

  useEffect(() => {
    const nextInputs = captureInputs(seeds, domains, entries, policy);
    const previous = previousInputs.current;
    const sources = collectVocabularySources(seeds, domains);
    const sourceByKey = new Map(sources.map((source) => [source.key, source]));
    const matchTermsChanged = previous.entryMatchFingerprint !== nextInputs.entryMatchFingerprint;
    const policyChanged = previous.policyFingerprint !== nextInputs.policyFingerprint;
    const changedEntryIds = entries.filter((entry) => previous.entryOutputFingerprints.get(entry.id) !== nextInputs.entryOutputFingerprints.get(entry.id)).map((entry) => entry.id);
    const changedSourceKeys = sources.filter((source) => previous.sourceFingerprints.get(source.key) !== nextInputs.sourceFingerprints.get(source.key)).map((source) => source.key);
    const removedSourceKeys = [...previous.sourceFingerprints.keys()].filter((key) => !nextInputs.sourceFingerprints.has(key));
    previousInputs.current = nextInputs;
    if (!matchTermsChanged && !policyChanged && changedEntryIds.length === 0 && changedSourceKeys.length === 0 && removedSourceKeys.length === 0) return;

    setIndexing(true);
    startTransition(() => {
      if (matchTermsChanged) {
        const rebuilt = buildVocabularyMatchCache(seeds, domains, entries, policy);
        cacheRef.current = rebuilt;
        setCache(rebuilt);
        setIndexing(false);
        return;
      }
      const matches = new Map(cacheRef.current.matches);
      const keys = new Set<string>();
      if (policyChanged) for (const source of sources) keys.add(source.key);
      for (const key of changedSourceKeys) keys.add(key);
      for (const entryId of changedEntryIds) for (const key of cacheRef.current.entryUsage.get(entryId) ?? []) keys.add(key);
      for (const key of removedSourceKeys) matches.delete(key);
      for (const key of keys) {
        const source = sourceByKey.get(key);
        if (source) matches.set(key, materializeVocabularyMatch(source, entries, policy));
      }
      const updated = { matches, entryUsage: rebuildReverseIndex(matches), builtAt: Date.now() };
      cacheRef.current = updated;
      setCache(updated);
      setIndexing(false);
    });
  }, [domains, entries, policy, seeds]);

  return { cache, indexing };
}
