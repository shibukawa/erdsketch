import { CircleCheck, CircleX, Replace, TriangleAlert } from "lucide-react";
import type { MouseEvent } from "react";
import type { DataDomain, ModelSeed } from "../../features/modeling/types";
import { getPrimaryVocabularyIndicator, type VocabularyMatch, type VocabularyMatchCache } from "../../features/modeling/vocabulary";
import { VocabularyDisplayName } from "./VocabularyDisplayName";

type VocabularyUsageListProps = {
  seeds: ModelSeed[];
  domains: DataDomain[];
  cache: VocabularyMatchCache;
  matches: VocabularyMatch[];
  scope: "tables" | "domains";
  selectedTableId: string;
  focusMatchKey?: string | null;
  onScopeClick: (event: MouseEvent<HTMLButtonElement>) => void;
  onTableClick: (event: MouseEvent<HTMLButtonElement>) => void;
  onRegister: (event: MouseEvent<HTMLButtonElement>) => void;
  onAliasReplace: (event: MouseEvent<HTMLButtonElement>) => void;
};

function UsageIndicator({ match }: { match: VocabularyMatch }) {
  const indicator = getPrimaryVocabularyIndicator(match);
  if (indicator === "unregistered") return <span className="badge badge-error badge-sm gap-1"><CircleX size={12} />Unregistered</span>;
  if (indicator === "missingSystemName") return <span className="badge badge-sm border-orange-300 bg-orange-50 text-orange-800"><TriangleAlert size={12} />System</span>;
  if (indicator === "missingPhysicalName") return <span className="badge badge-sm border-yellow-300 bg-yellow-50 text-yellow-900"><TriangleAlert size={12} />Physical</span>;
  if (indicator === "aliasMatch") return <span className="badge badge-sm border-purple-300 bg-purple-100 text-purple-800"><Replace size={12} />Alias</span>;
  return <span className="inline-flex items-center gap-1 font-bold text-emerald-600"><CircleCheck size={15} />Complete</span>;
}

export function VocabularyUsageList({ seeds, domains, cache, matches, scope, selectedTableId, focusMatchKey, onScopeClick, onTableClick, onRegister, onAliasReplace }: VocabularyUsageListProps) {
  return <div className="flex min-h-0 flex-1">
    <aside className="w-64 border-r border-slate-200 p-4">
      <div className="grid grid-cols-2 rounded-lg bg-slate-100 p-1"><button type="button" data-scope="tables" className={`rounded p-2 text-xs font-bold ${scope === "tables" ? "bg-white shadow" : ""}`} onClick={onScopeClick}>Tables</button><button type="button" data-scope="domains" className={`rounded p-2 text-xs font-bold ${scope === "domains" ? "bg-white shadow" : ""}`} onClick={onScopeClick}>Domains</button></div>
      {scope === "tables" && <div role="listbox" aria-label="Project tables" className="mt-4 max-h-[min(60vh,560px)] space-y-1 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1">{seeds.map((seed) => { const selected = seed.id === selectedTableId; return <button data-i18n-skip key={seed.id} type="button" role="option" aria-selected={selected} data-table-id={seed.id} className={`flex w-full items-center rounded-md px-3 py-2 text-left text-sm transition-colors ${selected ? "bg-blue-100 font-bold text-blue-950" : "text-slate-700 hover:bg-slate-100"}`} onClick={onTableClick}>{seed.names?.business || seed.title}</button>; })}{seeds.length === 0 && <p className="px-3 py-6 text-center text-xs text-slate-400">No tables</p>}</div>}
      {scope === "domains" && <p className="mt-4 text-sm text-slate-500">{domains.filter((domain) => !domain.system).length} project domains</p>}
    </aside>
    <div className="min-w-0 flex-1 overflow-auto p-5">
      <div className="grid grid-cols-[minmax(180px,1.2fr)_minmax(160px,1fr)_minmax(160px,1fr)_minmax(160px,1fr)_110px] gap-2 border-b border-slate-200 px-2 pb-2 text-xs font-bold uppercase text-slate-500"><span>Status</span><span>Business</span><span>System</span><span>Physical</span><span>Action</span></div>
      {matches.map((match) => { const alias = match.aliasMatches[0]; const focused = focusMatchKey === match.key; return <div id={`vocabulary-usage-${match.key}`} key={match.key} className={`grid grid-cols-[minmax(180px,1.2fr)_minmax(160px,1fr)_minmax(160px,1fr)_minmax(160px,1fr)_110px] items-center gap-2 border-b border-slate-100 px-2 py-3 text-sm ${focused ? "bg-red-50 ring-1 ring-inset ring-red-200" : ""}`}><UsageIndicator match={match} /><span><VocabularyDisplayName cache={cache} cacheKey={match.key} legacyName={match.sourceText} mode="business" navigable={false} /></span><span><VocabularyDisplayName cache={cache} cacheKey={match.key} legacyName={match.sourceText} mode="system" navigable={false} /></span><code><VocabularyDisplayName cache={cache} cacheKey={match.key} legacyName={match.sourceText} mode="physical" navigable={false} /></code><span>{match.unmatched.length > 0 && <button type="button" data-match-key={match.key} className="btn btn-xs btn-outline" aria-label={`Register vocabulary for ${match.names.business}`} onClick={onRegister}>Register</button>}{alias && <button type="button" data-match-key={match.key} data-segment-index={alias.segmentIndex} className="btn btn-xs border-purple-300 text-purple-700 hover:bg-purple-50" title={`Replace “${alias.alias}” with “${alias.preferred}”`} onClick={onAliasReplace}>Use <span data-i18n-skip>{alias.preferred}</span></button>}</span></div>; })}
    </div>
  </div>;
}
