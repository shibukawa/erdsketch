import { ArrowRight, Check, GitBranch, Info, Sparkles, X } from "lucide-react";
import { useCallback, useMemo, useState, type ChangeEvent } from "react";
import type { DataDomain, ModelSeed, RefinementInput, RefinementPatternId, RefinementResult, Relationship, RelationshipReference } from "../../features/modeling/types";
import { buildRefinement, findSimilarFieldGroups, getFieldCodeSet, refinementPatterns, refinementUnavailableReason } from "../../features/modeling/refinement";
import { getFieldEffectiveName } from "../../features/modeling/utils";

type RefinementPanelProps = {
  source: ModelSeed;
  seeds: ModelSeed[];
  relationships: Relationship[];
  relationshipReferences: RelationshipReference[];
  domains: DataDomain[];
  selectedFieldIds: string[];
  selectedRelationshipIds: string[];
  canEdit: boolean;
  onApply: (result: RefinementResult) => Promise<boolean>;
};

function initialInput(patternId: RefinementPatternId, source: ModelSeed, selectedFieldIds: string[], selectedRelationshipIds: string[], domains: DataDomain[]): RefinementInput {
  const selected = source.fields.filter((field) => selectedFieldIds.includes(field.id));
  const codeSetEntries = [...new Map(selected.flatMap((field) => getFieldCodeSet(field, domains)?.codeSetEntries ?? []).map((entry) => [entry.id, entry])).values()];
  return {
    patternId, sourceId: source.id, selectedFieldIds, selectedRelationshipIds, modelName: patternId === "create-work" ? `${source.title} Work` : patternId === "create-history" ? `${source.title} History` : patternId === "extract-master" ? `${source.title} Master` : `${source.title} Detail`, keyMode: "selected",
    keyFieldIds: selected.filter((field) => field.primaryKey).map((field) => field.id).concat(selected[0]?.id ?? []).slice(0, 1),
    newKeyName: "id", keepSnapshot: false, cardinality: "1:N", ordered: false, orderFieldName: "position",
    historyStorage: "source", currentModelName: `${source.title} Current`, temporalMode: "instant", temporalNames: ["effective_at"],
    inheritParent: false, domainName: `${source.title} Details`, similarModelIds: [], codeSetModelNames: Object.fromEntries(codeSetEntries.map((entry) => [entry.id, `${entry.name} ${source.title}`]))
  };
}

function PreviewCard({ seed, original }: { seed: ModelSeed; original?: ModelSeed }) {
  const added = new Set(seed.fields.filter((field) => !original?.fields.some((item) => item.id === field.id)).map((field) => field.id));
  const hasInheritedFields = seed.fields.some((field) => field.id.startsWith("inherited:"));
  return <article className="min-w-[190px] rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
    <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">{original ? "Changed model" : "New model"}</p>
    <h4 className="mt-1 font-bold text-slate-900">{seed.title}</h4>
    <p className="text-[10px] text-slate-500">{seed.role} · {seed.dependency}</p>
    <ul className="mt-2 space-y-1">{seed.fields.map((field) => {
      const inherited = field.id.startsWith("inherited:");
      return <li key={field.id} className={`flex items-center justify-between gap-2 rounded px-2 py-1 font-mono text-[11px] ${inherited ? "border border-dashed border-violet-200 bg-violet-50 text-violet-800" : added.has(field.id) ? "bg-emerald-50 text-emerald-800" : "bg-slate-50 text-slate-700"}`}><span>{field.primaryKey ? "🔑 " : ""}{field.name}</span><span className="shrink-0 font-sans text-[8px] font-bold uppercase tracking-wide opacity-70">{inherited ? "Inherited" : "Owned"}</span></li>;
    })}</ul>
    {hasInheritedFields && <p className="mt-2 rounded bg-violet-50 px-2 py-1.5 text-[9px] leading-4 text-violet-800">Logical view: inherited from parent.<br/>Physical view: parent attributes are projected into this model.</p>}
  </article>;
}

function previewDisplaySeed(seed: ModelSeed, result: RefinementResult, domains: DataDomain[]) {
  const parentIds = result.relationships.filter((relationship) => relationship.kind === "inherit" && relationship.sourceId === seed.id).map((relationship) => relationship.targetId);
  const inherited = result.seeds.filter((candidate) => parentIds.includes(candidate.id)).flatMap((parent) => parent.fields.map((field) => ({ ...field, id: `inherited:${parent.id}:${field.id}`, name: getFieldEffectiveName(field, domains), useDomainName: false })));
  return inherited.length ? { ...seed, fields: [...seed.fields, ...inherited] } : seed;
}

export function RefinementPanel({ source, seeds, relationships, relationshipReferences, domains, selectedFieldIds, selectedRelationshipIds, canEdit, onApply }: RefinementPanelProps) {
  const selectedFields = useMemo(() => source.fields.filter((field) => selectedFieldIds.includes(field.id)), [selectedFieldIds, source.fields]);
  const selectedCodeSetEntries = useMemo(() => [...new Map(selectedFields.flatMap((field) => getFieldCodeSet(field, domains)?.codeSetEntries ?? []).map((entry) => [entry.id, entry])).values()], [domains, selectedFields]);
  const similarGroups = useMemo(() => findSimilarFieldGroups(source, selectedFieldIds, seeds), [seeds, selectedFieldIds, source]);
  const [input, setInput] = useState<RefinementInput | null>(null);
  const [error, setError] = useState("");
  const [applying, setApplying] = useState(false);
  const preview = useMemo(() => {
    if (!input) return null;
    try { return buildRefinement(input, { seeds, relationships, relationshipReferences, domains }, (() => { let count = 0; return () => `preview-${input.patternId}-${count++}`; })()); }
    catch (reason) { return reason instanceof Error ? reason : new Error("Preview could not be generated."); }
  }, [domains, input, relationshipReferences, relationships, seeds]);
  const validPreview = preview && !(preview instanceof Error) ? preview : null;
  const open = useCallback((patternId: RefinementPatternId) => { setError(""); setInput(initialInput(patternId, source, selectedFieldIds, selectedRelationshipIds, domains)); }, [domains, selectedFieldIds, selectedRelationshipIds, source]);
  const close = useCallback(() => { if (!applying) setInput(null); }, [applying]);
  const textChange = useCallback((key: keyof RefinementInput) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setInput((current) => current ? { ...current, [key]: event.target.value } : current), []);
  const boolChange = useCallback((key: keyof RefinementInput) => (event: ChangeEvent<HTMLInputElement>) => setInput((current) => current ? { ...current, [key]: event.target.checked } : current), []);
  const temporalChange = useCallback((index: number, value: string) => setInput((current) => current ? { ...current, temporalNames: current.temporalNames.map((item, itemIndex) => itemIndex === index ? value : item) } : current), []);
  const toggleSimilarModel = useCallback((modelId: string) => setInput((current) => current ? { ...current, similarModelIds: current.similarModelIds.includes(modelId) ? current.similarModelIds.filter((id) => id !== modelId) : [...current.similarModelIds, modelId] } : current), []);
  const toggleKeyField = useCallback((fieldId: string) => setInput((current) => current ? { ...current, keyFieldIds: current.keyFieldIds.includes(fieldId) ? current.keyFieldIds.filter((id) => id !== fieldId) : [...current.keyFieldIds, fieldId] } : current), []);
  const changeCodeSetModelName = useCallback((value: string, name: string) => setInput((current) => current ? { ...current, codeSetModelNames: { ...current.codeSetModelNames, [value]: name } } : current), []);
  const apply = useCallback(async () => {
    if (!input || preview instanceof Error || !preview) return;
    setApplying(true); setError("");
    try {
      const result = buildRefinement(input, { seeds, relationships, relationshipReferences, domains });
      if (await onApply(result)) setInput(null); else setError("The refinement could not be saved. Check model locks and try again.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "The refinement could not be applied."); }
    finally { setApplying(false); }
  }, [domains, input, onApply, preview, relationshipReferences, relationships, seeds]);

  return <div className="h-full min-h-0 overflow-y-auto border-l border-slate-200 bg-slate-50 p-3">
    <div className="mb-3 flex items-center gap-2"><Sparkles size={15} className="text-violet-600"/><div><h3 className="text-sm font-bold">Refinement patterns</h3><p className="text-[10px] text-slate-500">Select fields, then preview a safe transformation.</p></div></div>
    <ul className="space-y-2">{refinementPatterns.map((pattern) => {
      const reason = refinementUnavailableReason(pattern.id, source, selectedFields, domains, canEdit, selectedRelationshipIds.length);
      return <li key={pattern.id}><button type="button" disabled={!!reason} title={reason || pattern.description} onClick={() => open(pattern.id)} className="group w-full rounded-lg border border-slate-200 bg-white p-2.5 text-left shadow-sm transition hover:border-violet-300 hover:shadow disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-55">
        <span className="flex items-start justify-between gap-2"><span><strong className="block text-xs text-slate-800">{pattern.title}</strong><span className="mt-0.5 block text-[10px] leading-4 text-slate-500">{reason || pattern.description}</span></span>{reason ? <Info size={13} className="shrink-0 text-amber-600"/> : <ArrowRight size={13} className="shrink-0 text-violet-500"/>}</span>
      </button></li>;
    })}</ul>
    {input && preview && <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/35 p-4" role="presentation">
      <section role="dialog" aria-modal="true" aria-labelledby="refinement-dialog-title" className="flex max-h-[92vh] w-[min(1100px,96vw)] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-start justify-between border-b border-slate-200 px-5 py-4"><div><p className="text-xs font-bold uppercase tracking-wider text-violet-600">Model refinement</p><h2 id="refinement-dialog-title" className="text-xl font-bold">{refinementPatterns.find((item) => item.id === input.patternId)?.title}</h2></div><button type="button" className="btn btn-ghost btn-sm btn-square" onClick={close} aria-label="Close refinement dialog"><X size={18}/></button></header>
        <div className="grid min-h-0 flex-1 grid-cols-[330px_1fr] overflow-hidden">
          <form className="overflow-y-auto border-r border-slate-200 p-5" onSubmit={(event) => { event.preventDefault(); void apply(); }}>
            {input.patternId !== "extract-domain" && input.patternId !== "split-code-set" && <label className="form-control mb-4"><span className="mb-1 text-xs font-bold">New model name</span><input className="input input-bordered input-sm" value={input.modelName} onChange={textChange("modelName")} required/></label>}
            {input.patternId === "extract-domain" && <label className="form-control mb-4"><span className="mb-1 text-xs font-bold">Domain name</span><input className="input input-bordered input-sm" value={input.domainName} onChange={textChange("domainName")} required/></label>}
            {input.patternId === "extract-domain" && <fieldset className="mb-4 rounded-lg border border-slate-200 p-3"><legend className="px-1 text-xs font-bold">Similar fields</legend><label className="flex items-start gap-2 text-xs"><input type="checkbox" checked disabled/><span><strong>{source.title}</strong><small className="block text-slate-500">{selectedFields.map((field) => field.name).join(", ")}</small></span></label>{similarGroups.length === 0 && <p className="mt-2 text-[10px] text-slate-500">No similar field groups found.</p>}{similarGroups.map((group) => <label key={group.seed.id} className="mt-2 flex items-start gap-2 text-xs"><input type="checkbox" checked={input.similarModelIds.includes(group.seed.id)} onChange={() => toggleSimilarModel(group.seed.id)}/><span><strong>{group.seed.title}</strong><small className="block text-slate-500">{group.fields.map((field) => field.name).join(", ")}</small></span></label>)}</fieldset>}
            {["extract-master","multiple-items","extract-optional","extract-one-to-one"].includes(input.patternId) && <fieldset className="mb-4 rounded-lg border border-slate-200 p-3"><legend className="px-1 text-xs font-bold">Primary key</legend><label className="flex items-center gap-2 text-xs"><input type="radio" checked={input.keyMode === "selected"} onChange={() => setInput({ ...input, keyMode: "selected" })}/>Use selected fields</label>{input.keyMode === "selected" && <div className="ml-5 mt-2 space-y-1">{selectedFields.map((field) => <label key={field.id} className="flex items-center gap-2 text-xs"><input type="checkbox" checked={input.keyFieldIds.includes(field.id)} onChange={() => toggleKeyField(field.id)}/>{field.name}</label>)}</div>}<label className="mt-2 flex items-center gap-2 text-xs"><input type="radio" checked={input.keyMode === "new"} onChange={() => setInput({ ...input, keyMode: "new" })}/>Create new key</label>{input.keyMode === "new" && <><input className="input input-bordered input-sm mt-2 w-full" value={input.newKeyName} onChange={textChange("newKeyName")}/><select aria-label="New key domain" className="select select-bordered select-sm mt-2 w-full" value={input.newKeyDomainId ?? ""} onChange={textChange("newKeyDomainId")}><option value="">No domain</option>{domains.map((domain) => <option key={domain.id} value={domain.id}>{domain.name}</option>)}</select></>}</fieldset>}
            {input.patternId === "extract-master" && <label className="mb-4 flex items-center gap-2 text-xs"><input type="checkbox" checked={input.keepSnapshot} onChange={boolChange("keepSnapshot")}/>Keep snapshot fields on source</label>}
            {input.patternId === "multiple-items" && <><label className="form-control mb-3"><span className="mb-1 text-xs font-bold">Cardinality</span><select className="select select-bordered select-sm" value={input.cardinality} onChange={textChange("cardinality")}><option>1:N</option><option>N:M</option></select></label><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={input.ordered} onChange={boolChange("ordered")}/>Keep item order</label>{input.ordered && <input className="input input-bordered input-sm mt-2 w-full" value={input.orderFieldName} onChange={textChange("orderFieldName")}/>}</>}
            {input.patternId === "create-history" && <><label className="form-control mb-3"><span className="mb-1 text-xs font-bold">Field storage</span><select className="select select-bordered select-sm" value={input.historyStorage} onChange={textChange("historyStorage")}><option value="source">Keep latest on source</option><option value="history">History only</option><option value="current">Dedicated current model</option></select></label>{input.historyStorage === "current" && <label className="form-control mb-3"><span className="mb-1 text-xs font-bold">Current model name</span><input className="input input-bordered input-sm" value={input.currentModelName} onChange={textChange("currentModelName")}/></label>}<label className="form-control mb-3"><span className="mb-1 text-xs font-bold">Temporal key</span><select className="select select-bordered select-sm" value={input.temporalMode} onChange={(event) => setInput({ ...input, temporalMode: event.target.value as RefinementInput["temporalMode"], temporalNames: event.target.value === "range" ? ["valid_from","valid_to"] : [event.target.value === "version" ? "version" : "effective_at"] })}><option value="instant">Date / datetime</option><option value="version">Version</option><option value="range">Date range (end is key)</option></select></label>{input.temporalNames.map((name,index) => <input key={index} aria-label={input.temporalMode === "range" ? (index === 0 ? "Range start field" : "Range end key field") : "Temporal key field"} className="input input-bordered input-sm mb-2 w-full" value={name} onChange={(event) => temporalChange(index,event.target.value)}/>)}</>}
            {input.patternId === "split-code-set" && <><label className="mb-3 flex items-center gap-2 text-xs"><input type="checkbox" checked={input.inheritParent} onChange={boolChange("inheritParent")}/>Connect variants using inherit</label>{selectedCodeSetEntries.map((entry) => <label key={entry.id} className="form-control mb-2"><span className="mb-1 text-[10px] font-bold text-slate-500">{entry.name} model</span><input className="input input-bordered input-sm" value={input.codeSetModelNames[entry.id] ?? ""} onChange={(event) => changeCodeSetModelName(entry.id,event.target.value)}/></label>)}</>}
            {error && <p className="mt-4 rounded bg-red-50 p-2 text-xs text-red-700">{error}</p>}
          </form>
          <div className="min-h-0 overflow-y-auto bg-slate-50 p-5"><div className="flex items-center gap-2"><GitBranch size={16} className="text-violet-600"/><h3 className="font-bold">After refinement</h3></div><p className="mt-1 text-xs text-slate-500">This exact model graph will be applied.</p>{validPreview ? <><div className="mt-4 flex flex-wrap gap-3">{validPreview.seeds.filter((seed) => validPreview.affectedSeedIds.includes(seed.id) || validPreview.createdSeedIds.includes(seed.id)).map((seed) => <PreviewCard key={seed.id} seed={previewDisplaySeed(seed, validPreview, domains)} original={seeds.find((item) => item.id === seed.id)}/>)}</div><ul className="mt-4 space-y-1">{validPreview.summary.map((item) => <li key={item} className="flex items-center gap-2 text-xs text-slate-700"><Check size={13} className="text-emerald-600"/>{item}</li>)}</ul><div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-900">Relationships after change: <strong>{validPreview.relationships.length}</strong> · Domains: <strong>{validPreview.domains.length}</strong></div></> : <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm font-semibold text-amber-900">{preview instanceof Error ? preview.message : "Preview unavailable."}</p>}</div>
        </div>
        <footer className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3"><button type="button" className="btn btn-ghost btn-sm" onClick={close}>Cancel</button><button type="button" className="btn btn-primary btn-sm" disabled={applying || !validPreview} onClick={() => void apply()}>{applying ? "Applying…" : "Apply refinement"}</button></footer>
      </section>
    </div>}
  </div>;
}
