import { Code2, Gauge, Settings2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type MouseEvent, type PointerEvent, type SyntheticEvent, type WheelEvent } from "react";
import { createPortal } from "react-dom";
import type { DataDomain, ModelSeed } from "../../features/modeling/types";
import { AdditionalSqlPanel } from "./AdditionalSqlPanel";
import { CapacityEstimatePanel } from "./CapacityEstimatePanel";
import { ModelBasicSettingsPanel } from "./ModelBasicSettingsPanel";

type ModelEditDialogProps = {
  model: ModelSeed;
  domains: DataDomain[];
  canEdit: boolean;
  onSave: (patch: Partial<ModelSeed>) => void;
  onClose: () => void;
};

type ModelEditTab = "basic" | "capacity" | "sql";

export function ModelEditDialog({ model, domains, canEdit, onSave, onClose }: ModelEditDialogProps) {
  const [draft, setDraft] = useState<ModelSeed>(() => structuredClone(model));
  const [tab, setTab] = useState<ModelEditTab>("basic");
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  useEffect(() => { dialogRef.current?.showModal(); }, []);
  const handleDraftChange = useCallback((patch: Partial<ModelSeed>) => setDraft((current) => ({ ...current, ...patch })), []);
  const handleVolumeChange = useCallback((volumeEstimate: NonNullable<ModelSeed["volumeEstimate"]>) => handleDraftChange({ volumeEstimate }), [handleDraftChange]);
  const handleSqlChange = useCallback((additionalSql: string) => handleDraftChange({ additionalSql }), [handleDraftChange]);
  const handleTabClick = useCallback((event: MouseEvent<HTMLButtonElement>) => setTab(event.currentTarget.dataset.tab as ModelEditTab), []);
  const handleSubmit = useCallback((event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSave({ names: draft.names, vocabularyBinding: draft.vocabularyBinding, description: draft.description, role: draft.role, dependency: draft.dependency, hasPrivacy: draft.hasPrivacy, volumeEstimate: draft.volumeEstimate, additionalSql: draft.additionalSql });
  }, [draft, onSave]);
  const handleCancel = useCallback((event: SyntheticEvent<HTMLDialogElement>) => { event.preventDefault(); onClose(); }, [onClose]);
  const handleBackdropClick = useCallback((event: MouseEvent<HTMLDialogElement>) => { if (event.target === event.currentTarget) onClose(); }, [onClose]);
  const stopPointer = useCallback((event: PointerEvent<HTMLDialogElement>) => event.stopPropagation(), []);
  const stopWheel = useCallback((event: WheelEvent<HTMLDialogElement>) => event.stopPropagation(), []);

  return createPortal(
    <dialog ref={dialogRef} className="field-list-dialog m-auto h-[min(90vh,860px)] w-[min(96vw,1180px)] rounded-xl border border-slate-200 bg-white p-0 text-slate-950 shadow-2xl" aria-labelledby="model-edit-title" onCancel={handleCancel} onClick={handleBackdropClick} onPointerDown={stopPointer} onWheel={stopWheel}>
      <form className="flex h-full min-h-0 flex-col" onSubmit={handleSubmit}>
        <header className="shrink-0 border-b border-slate-200 px-5 pt-4">
          <div className="flex items-start justify-between gap-5"><div><p className="text-xs font-bold uppercase tracking-wide text-blue-600">Model definition</p><h2 id="model-edit-title" className="mt-1 text-xl font-bold">Edit {draft.names?.business ?? draft.title}</h2></div><button type="button" className="btn btn-ghost btn-sm btn-square -mr-1 -mt-1" onClick={onClose} aria-label="Close model editor"><X size={18}/></button></div>
          <div role="tablist" className="tabs tabs-lift mt-4 flex flex-nowrap whitespace-nowrap">
            <button type="button" role="tab" data-tab="basic" aria-selected={tab === "basic"} className={`tab h-11 min-w-0 flex-1 gap-2 ${tab === "basic" ? "tab-active bg-white" : "bg-slate-100"}`} onClick={handleTabClick}><Settings2 size={15}/>Basic settings</button>
            <button type="button" role="tab" data-tab="capacity" aria-selected={tab === "capacity"} className={`tab h-11 min-w-0 flex-1 gap-2 ${tab === "capacity" ? "tab-active bg-white" : "bg-slate-100"}`} onClick={handleTabClick}><Gauge size={15}/>Capacity</button>
            <button type="button" role="tab" data-tab="sql" aria-selected={tab === "sql"} className={`tab h-11 min-w-0 flex-1 gap-2 ${tab === "sql" ? "tab-active bg-white" : "bg-slate-100"}`} onClick={handleTabClick}><Code2 size={15}/>Additional SQL</button>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto bg-white">
          {tab === "basic" ? <ModelBasicSettingsPanel model={draft} canEdit={canEdit} onChange={handleDraftChange}/> : tab === "capacity" ? <CapacityEstimatePanel model={draft} domains={domains} canEdit={canEdit} onChange={handleVolumeChange}/> : <AdditionalSqlPanel value={draft.additionalSql ?? ""} canEdit={canEdit} onChange={handleSqlChange}/>} 
        </div>
        <footer className="flex shrink-0 justify-end gap-2 border-t border-slate-200 px-5 py-4"><button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button><button type="submit" className="btn btn-primary" disabled={!canEdit}>Save model</button></footer>
      </form>
    </dialog>,
    document.body
  );
}
