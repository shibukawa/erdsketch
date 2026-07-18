import { TriangleAlert, X } from "lucide-react";
import { useCallback, useEffect, useRef, type MouseEvent, type SyntheticEvent } from "react";
import { createPortal } from "react-dom";
import type { ModelSeed } from "../../features/modeling/types";

type Props = {
  model: ModelSeed;
  pending: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export function ModelRemovalDialog({ model, pending, onConfirm, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  useEffect(() => { dialogRef.current?.showModal(); }, []);
  const handleCancel = useCallback((event: SyntheticEvent<HTMLDialogElement>) => { event.preventDefault(); if (!pending) onClose(); }, [onClose, pending]);
  const handleBackdropClick = useCallback((event: MouseEvent<HTMLDialogElement>) => { if (!pending && event.target === event.currentTarget) onClose(); }, [onClose, pending]);

  return createPortal(<dialog ref={dialogRef} className="m-auto w-[min(92vw,460px)] rounded-xl border border-slate-200 bg-white p-0 text-slate-950 shadow-2xl" aria-labelledby="remove-model-title" onCancel={handleCancel} onClick={handleBackdropClick}>
    <div className="p-5">
      <div className="flex items-start justify-between gap-4"><div className="flex gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600"><TriangleAlert size={20}/></span><div><h2 id="remove-model-title" className="font-bold">Delete model from project?</h2><p className="mt-1 text-sm text-slate-600">“<span data-i18n-skip>{model.names?.business || model.title}</span>” and all of its ERD and DFD placements will be deleted. This affects every canvas.</p></div></div><button type="button" className="btn btn-ghost btn-sm btn-square" onClick={onClose} disabled={pending} aria-label="Close"><X size={17}/></button></div>
      <div className="mt-5 flex justify-end gap-2"><button type="button" className="btn btn-ghost" onClick={onClose} disabled={pending}>Cancel</button><button type="button" className="btn btn-error" onClick={onConfirm} disabled={pending}>{pending ? "Deleting…" : "Delete from project"}</button></div>
    </div>
  </dialog>, document.body);
}
