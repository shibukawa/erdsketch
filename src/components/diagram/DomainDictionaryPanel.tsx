import { BookOpen, GripVertical, Plus, Search } from "lucide-react";
import { useCallback, useMemo, useState, type ChangeEvent, type DragEvent, type KeyboardEvent } from "react";
import type { DataDomain, DomainCategory, NameDisplayMode, PrimitiveType } from "../../features/modeling/types";
import { isAssignableDomain } from "../../features/modeling/utils";
import type { VocabularyMatchCache } from "../../features/modeling/vocabulary";
import { VocabularyDisplayName } from "./VocabularyDisplayName";

type DomainDictionaryPanelProps = {
  domains: DataDomain[];
  categories: DomainCategory[];
  nameDisplayMode: NameDisplayMode;
  vocabularyCache: VocabularyMatchCache;
  canEdit: boolean;
  onCreate: (name: string) => void;
  onOpen: () => void;
};

const primitiveLabels: Record<PrimitiveType, string> = {
  integer: "Integer",
  decimal: "Decimal",
  floating_point: "Floating point",
  varchar: "Varchar",
  text: "Text",
  blob: "Blob",
  date: "Date",
  time: "Time",
  datetime: "Datetime",
  datetime_with_timezone: "Datetime with timezone",
  boolean: "Boolean",
  uuid: "UUID",
  code_set: "Code Set"
};

function domainTypeSummary(domain: DataDomain) {
  if (domain.shape === "unresolved") return "undefined";
  if (domain.shape === "composite") return domain.components.length ? `${domain.components.length} fields` : "empty multi-field";
  const primitive = domain.primitiveType ? primitiveLabels[domain.primitiveType] : "undefined";
  if (domain.primitiveType === "varchar" && domain.length) return `${primitive}(${domain.length})`;
  if ((domain.primitiveType === "integer" || domain.primitiveType === "floating_point") && domain.bits) return `${primitive} · ${domain.bits} bit`;
  if (domain.primitiveType === "code_set") return `${primitive} · ${domain.codeSetEntries?.length ?? 0}`;
  return primitive;
}

export function DomainDictionaryPanel({ domains, categories, nameDisplayMode, vocabularyCache, canEdit, onCreate, onOpen }: DomainDictionaryPanelProps) {
  const [quickEntry, setQuickEntry] = useState("");
  const [query, setQuery] = useState("");
  const matchingDomains = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return domains.filter(isAssignableDomain);
    return domains.filter((domain) => {
      const category = categories.find((item) => item.id === domain.categoryId);
      return isAssignableDomain(domain) && [domain.name, domain.primitiveType ?? "", domain.categoryId, category?.name ?? "", ...domain.components.map((component) => component.name)].some((value) => value.toLowerCase().includes(normalized));
    });
  }, [categories, domains, query]);

  const handleQuickEntryChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setQuickEntry(event.target.value);
  }, []);

  const handleQuickEntryKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key !== "Enter" || event.nativeEvent.isComposing || event.keyCode === 229) return;
      event.preventDefault();
      const name = quickEntry.trim();
      if (!canEdit || !name) return;
      onCreate(name);
      setQuickEntry("");
    },
    [canEdit, onCreate, quickEntry]
  );

  const handleQueryChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
  }, []);

  const handleDomainDragStart = useCallback((event: DragEvent<HTMLButtonElement>) => {
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData("application/x-erdsketch-domain-id", event.currentTarget.dataset.domainId ?? "");
  }, []);

  const handleOpen = useCallback(() => {
    onOpen();
  }, [onOpen]);

  return (
    <aside className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-slate-50 p-4" aria-label="Domain candidates">
      <div className="flex items-center gap-2 text-sm font-bold text-slate-800"><BookOpen size={16} />Domain dictionary</div>
      <label className="input input-bordered intent-add mt-3 flex h-10 items-center gap-2">
        <Plus size={15} className="text-slate-400" />
        <input type="text" className="min-w-0 grow text-sm" value={quickEntry} onChange={handleQuickEntryChange} onKeyDown={handleQuickEntryKeyDown} disabled={!canEdit} placeholder="Add domain name + Enter" aria-label="New domain name" />
      </label>
      <label className="input input-bordered intent-search mt-3 flex h-9 items-center gap-2">
        <Search size={14} className="text-slate-400" />
        <input type="text" className="min-w-0 grow text-sm" value={query} onChange={handleQueryChange} placeholder="Search assignable domains" aria-label="Search assignable domains" />
      </label>
      <p className="mt-2 text-[11px] leading-4 text-slate-500">Drag any domain to a field row. Its definition can remain undefined or an empty multi-field.</p>
      <ul className="mt-2 min-h-0 w-full flex-1 space-y-1 overflow-y-auto overscroll-contain pr-1" aria-label="Assignable domains">
        {matchingDomains.map((domain) => <li key={domain.id} className="w-full"><button type="button" data-domain-id={domain.id} draggable={canEdit} className="flex w-full min-w-0 items-center gap-2 rounded-md bg-white px-2 py-2 text-left shadow-sm ring-1 ring-slate-200 hover:ring-blue-300" onDragStart={handleDomainDragStart}><GripVertical size={14} className="shrink-0 text-slate-400" /><span className="min-w-0 flex-1 break-words font-mono text-xs font-semibold leading-tight"><VocabularyDisplayName cache={vocabularyCache} cacheKey={`domain:${domain.id}`} legacyName={domain.name} names={domain.names} mode={nameDisplayMode} /></span><span className="max-w-[48%] shrink-0 break-words text-right text-[10px] leading-tight text-slate-500">{domainTypeSummary(domain)}</span></button></li>)}
        {matchingDomains.length === 0 && <li className="rounded-md border border-dashed border-slate-300 bg-white px-3 py-4 text-center text-xs text-slate-500">No assignable domains match.</li>}
      </ul>
      <button type="button" className="btn btn-outline mt-3 justify-start gap-2" onClick={handleOpen}><BookOpen size={16} />Open domain dictionary</button>
    </aside>
  );
}
