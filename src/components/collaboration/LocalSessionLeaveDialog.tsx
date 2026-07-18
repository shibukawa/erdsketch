import { LogOut, X } from "lucide-react";

type LocalSessionLeaveDialogProps = {
  projectName?: string;
  onStay: () => void;
  onLeave: () => void;
};

export function LocalSessionLeaveDialog({ projectName, onStay, onLeave }: LocalSessionLeaveDialogProps) {
  return <div className="modal modal-open z-[120]" role="dialog" aria-modal="true" aria-labelledby="local-session-leave-title">
    <div className="modal-box max-w-lg rounded-xl bg-white p-0 shadow-2xl">
      <header className="border-b border-slate-200 px-6 py-5"><p className="text-xs font-bold uppercase tracking-wide text-amber-700">Local tab session</p><h2 id="local-session-leave-title" className="mt-1 text-xl font-bold">Leave this editing session?</h2></header>
      <div className="space-y-4 p-6">
        <p className="text-sm text-slate-700">{projectName ? `You are editing ${projectName} through its host tab.` : "You are editing through another host tab."}</p>
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">Host-accepted changes are saved. A change that is still waiting for the host is not guaranteed to be saved.</p>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-ghost gap-2" onClick={onStay}><X size={16} />Stay</button>
          <button type="button" className="btn btn-warning gap-2" onClick={onLeave}><LogOut size={16} />Leave</button>
        </div>
      </div>
    </div>
    <button className="modal-backdrop" onClick={onStay} aria-label="Stay in editing session" />
  </div>;
}
