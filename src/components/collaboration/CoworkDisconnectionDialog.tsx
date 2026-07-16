import { Eye, Unplug, X } from "lucide-react";
import { useCallback } from "react";

type CoworkDisconnectionDialogProps = {
  reason: string;
  hasSnapshot: boolean;
  updatedAt: number;
  onViewSnapshot: () => boolean;
  onCloseWorkspace: () => void;
};

export function CoworkDisconnectionDialog({ reason, hasSnapshot, updatedAt, onViewSnapshot, onCloseWorkspace }: CoworkDisconnectionDialogProps) {
  const handleViewSnapshot = useCallback(() => onViewSnapshot(), [onViewSnapshot]);

  const handleClose = useCallback(() => onCloseWorkspace(), [onCloseWorkspace]);

  return <div className="modal modal-open z-[120]" role="dialog" aria-modal="true" aria-labelledby="cowork-disconnected-title">
    <div className="modal-box max-w-xl rounded-xl bg-white p-0 shadow-2xl">
      <header className="border-b border-slate-200 px-6 py-5"><p className="text-xs font-bold uppercase tracking-wide text-amber-700">Connection interrupted</p><h2 id="cowork-disconnected-title" className="mt-1 text-xl font-bold">Co-work connection lost</h2></header>
      <div className="space-y-5 p-6">
        <div className="flex gap-3 rounded-xl bg-amber-50 p-4 text-amber-950"><Unplug className="mt-0.5 shrink-0" size={21} /><div><p className="font-semibold">Collaborative editing has stopped.</p><p className="mt-1 text-sm">{reason}</p></div></div>
        <div className="space-y-1 text-sm text-slate-600"><p>A new invitation is required to reconnect to the former host.</p>{hasSnapshot ? <><p>The last host-confirmed snapshot is available for reference.</p><p className="text-xs text-slate-500">Last synchronized: {new Date(updatedAt).toLocaleString()}</p></> : <p className="font-medium text-error">No valid synchronized snapshot is available.</p>}</div>
        <p className="rounded-lg border border-slate-200 p-3 text-xs text-slate-600">This is another person's model. The retained snapshot is read-only and cannot be promoted to an independently editable project.</p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="btn btn-ghost gap-2" onClick={handleClose}><X size={16} />Close</button>
          {hasSnapshot && <button type="button" className="btn btn-primary gap-2" onClick={handleViewSnapshot}><Eye size={16} />View read-only snapshot</button>}
        </div>
      </div>
    </div>
  </div>;
}
