import { ArrowRight, X } from "lucide-react";
import { startTransition, useCallback, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import type { CanvasModelPlacement, ErdCanvas, ModelSeed } from "../../features/modeling/types";

type OwnershipTransferDialogProps = {
  seed: ModelSeed;
  canvases: ErdCanvas[];
  placements: CanvasModelPlacement[];
  onTransfer: (targetCanvasId: string) => Promise<boolean>;
  onClose: () => void;
};

export function OwnershipTransferDialog({ seed, canvases, placements, onTransfer, onClose }: OwnershipTransferDialogProps) {
  const owner = placements.find((placement) => placement.seedId === seed.id && placement.accessMode === "owner");
  const candidates = canvases.filter((canvas) => canvas.id !== owner?.canvasId);
  const [targetId, setTargetId] = useState(candidates[0]?.id ?? "");
  const [saving, setSaving] = useState(false);
  const targetPlacement = useMemo(() => placements.find((placement) => placement.seedId === seed.id && placement.canvasId === targetId), [placements, seed.id, targetId]);
  const handleTargetChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => setTargetId(event.target.value), []);
  const handleSubmit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!targetId) return;
    setSaving(true);
    if (await onTransfer(targetId)) startTransition(onClose);
    setSaving(false);
  }, [onClose, onTransfer, targetId]);

  return <div className="modal modal-open" role="dialog" aria-modal="true" aria-labelledby="ownership-transfer-title">
    <div className="modal-box max-w-lg rounded-xl bg-white">
      <div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{seed.title}</p><h2 id="ownership-transfer-title" className="text-xl font-bold">Change owner canvas</h2></div><button type="button" className="btn btn-ghost btn-sm btn-square" onClick={onClose}><X size={18} /></button></div>
      {!owner ? <div className="alert alert-warning mt-5">This model has no exclusive owner and cannot be transferred here.</div> : <form className="mt-5" onSubmit={handleSubmit}>
        <label className="form-control"><span className="label-text mb-2 font-bold">New owner canvas</span><select className="select select-bordered w-full" value={targetId} onChange={handleTargetChange}>{candidates.map((canvas) => <option key={canvas.id} value={canvas.id}>{canvas.name}</option>)}</select></label>
        <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Effect preview</p><div className="mt-3 flex items-center gap-2 text-sm"><span className="rounded-md bg-white px-2 py-1 font-semibold">{canvases.find((canvas) => canvas.id === owner.canvasId)?.name}</span><span className="badge badge-ghost">readonly</span><ArrowRight size={15} /><span className="rounded-md bg-white px-2 py-1 font-semibold">{canvases.find((canvas) => canvas.id === targetId)?.name}</span><span className="badge badge-primary">owner</span></div><p className="mt-3 text-xs text-slate-500">{targetPlacement ? "The existing readonly placement will become the owner." : "A placement will be created on the target canvas."}</p></div>
        <div className="modal-action"><button type="button" className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={!targetId || saving}>{saving ? "Transferring…" : "Transfer ownership"}</button></div>
      </form>}
    </div><button className="modal-backdrop" onClick={onClose} aria-label="Close ownership transfer" />
  </div>;
}
