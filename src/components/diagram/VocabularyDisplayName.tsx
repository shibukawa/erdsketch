import { Languages } from "lucide-react";
import { useCallback, type KeyboardEvent, type MouseEvent } from "react";
import type { NameDisplayMode, NameSet } from "../../features/modeling/types";
import { getCachedDisplayName, type VocabularyMatchCache } from "../../features/modeling/vocabulary";
import { useVocabularyNavigation } from "./VocabularyNavigationContext";

type VocabularyDisplayNameProps = {
  cache: VocabularyMatchCache;
  cacheKey: string;
  legacyName: string;
  names?: NameSet;
  mode: NameDisplayMode;
  navigable?: boolean;
};

export function VocabularyDisplayName({ cache, cacheKey, legacyName, names, mode, navigable = true }: VocabularyDisplayNameProps) {
  const openVocabulary = useVocabularyNavigation();
  const match = cache.matches.get(cacheKey);
  const segments = match?.displaySegments[mode];
  const handleOpen = useCallback((event: MouseEvent<HTMLSpanElement>) => {
    event.preventDefault();
    event.stopPropagation();
    openVocabulary?.(cacheKey);
  }, [cacheKey, openVocabulary]);
  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLSpanElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    event.stopPropagation();
    openVocabulary?.(cacheKey);
  }, [cacheKey, openVocabulary]);
  if (!segments?.length) return <span data-i18n-skip>{getCachedDisplayName(cache, cacheKey, legacyName, names, mode)}</span>;
  const hasError = segments.some((segment) => segment.state !== "resolved");
  return <span className="group/vocabulary inline-flex min-w-0 items-center gap-1">{segments.map((segment, index) => <span data-i18n-skip key={`${index}-${segment.text}`} className={segment.state === "unmatched" || segment.state === "missing" ? "text-red-600 underline decoration-wavy" : segment.state === "alias" ? "text-red-600" : undefined} title={segment.state === "missing" ? `${mode === "system" ? "System" : "Physical"} name is not registered` : undefined}>{segment.text}</span>)}{hasError && navigable && openVocabulary && <span role="button" tabIndex={0} className="inline-flex shrink-0 cursor-pointer items-center rounded p-0.5 text-red-600 opacity-0 transition-opacity hover:bg-red-50 focus:opacity-100 group-hover/vocabulary:opacity-100" aria-label={`Open Vocabulary for ${legacyName}`} title="Open this error in Vocabulary" onClick={handleOpen} onKeyDown={handleKeyDown}><Languages size={13} /></span>}</span>;
}
