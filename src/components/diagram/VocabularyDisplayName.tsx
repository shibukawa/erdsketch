import { Languages } from "lucide-react";
import type { KeyboardEvent, MouseEvent, PointerEvent } from "react";
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
  function handleOpen(event: MouseEvent<HTMLSpanElement>) {
    event.preventDefault();
    event.stopPropagation();
    openVocabulary?.(cacheKey);
  }
  function handlePointerDown(event: PointerEvent<HTMLSpanElement>) {
    event.stopPropagation();
  }
  function handleKeyDown(event: KeyboardEvent<HTMLSpanElement>) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    event.stopPropagation();
    openVocabulary?.(cacheKey);
  }
  if (!segments?.length) return <span data-i18n-skip>{getCachedDisplayName(cache, cacheKey, legacyName, names, mode)}</span>;
  const hasError = segments.some((segment) => segment.state !== "resolved");
  const issueClass = segments.some((segment) => segment.state === "unmatched") ? "text-red-600 hover:bg-red-50" : segments.some((segment) => segment.state === "alias") ? "text-purple-700 hover:bg-purple-50" : mode === "system" ? "text-orange-600 hover:bg-orange-50" : "text-yellow-700 hover:bg-yellow-50";
  return <span className="group/vocabulary inline-flex min-w-0 items-center gap-1">{segments.map((segment, index) => {
    const className = segment.state === "unmatched" ? "text-red-600 underline decoration-wavy" : segment.state === "alias" ? "text-purple-700" : segment.state === "missing" && mode === "system" ? "text-orange-700 underline decoration-wavy decoration-orange-500" : segment.state === "missing" ? "text-yellow-800 underline decoration-wavy decoration-yellow-500" : undefined;
    return <span data-i18n-skip key={`${index}-${segment.text}`} className={className} title={segment.state === "missing" ? `${mode === "system" ? "System" : "Physical"} name is not registered` : segment.state === "alias" ? "Matched through an alias" : undefined}>{segment.text}</span>;
  })}{hasError && navigable && openVocabulary && <span data-no-drag="true" role="button" tabIndex={0} className={`inline-flex shrink-0 cursor-pointer items-center rounded p-0.5 opacity-0 transition-opacity focus:opacity-100 group-hover/vocabulary:opacity-100 ${issueClass}`} aria-label={`Open Vocabulary for ${legacyName}`} title="Open this issue in Vocabulary" onPointerDown={handlePointerDown} onClick={handleOpen} onKeyDown={handleKeyDown}><Languages size={13} /></span>}</span>;
}
