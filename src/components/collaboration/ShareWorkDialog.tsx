import { Check, Copy, Send, Share2, Unplug, UserPlus, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import type { ShareAccess, WebRtcSharingController } from "../../collaboration/webrtc/useWebRtcSharing";
import { defaultIceServerProfile, validateIceServerProfile, type IceServerProfile } from "../../collaboration/webrtc/ice";
import { IceServerFields } from "./IceServerFields";
import { copyShareText, shareUrl } from "./shareActions";

type ShareWorkDialogProps = {
  sharing: WebRtcSharingController;
};

export function ShareWorkDialog({ sharing }: ShareWorkDialogProps) {
  const [access, setAccess] = useState<ShareAccess>("edit");
  const [ice, setIce] = useState<IceServerProfile>(defaultIceServerProfile);
  const [invitationLabel, setInvitationLabel] = useState("");
  const [answer, setAnswer] = useState("");
  const [disconnectMessage, setDisconnectMessage] = useState("");
  const [notice, setNotice] = useState<string>();
  const [copyTooltipOpen, setCopyTooltipOpen] = useState(false);
  const copyTooltipTimerRef = useRef<number | undefined>(undefined);
  const busy = sharing.hostStatus === "gathering" || sharing.hostStatus === "connecting";
  const invitationStep = sharing.hostStatus === "gathering" || Boolean(sharing.invitationUrl);
  const validationError = validateIceServerProfile(ice);

  useEffect(() => () => {
    if (copyTooltipTimerRef.current !== undefined) window.clearTimeout(copyTooltipTimerRef.current);
  }, []);

  const handleAccessChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => setAccess(event.target.value as ShareAccess), []);
  const handleIceChange = useCallback((value: IceServerProfile) => setIce(value), []);
  const handleInvitationLabelChange = useCallback((event: ChangeEvent<HTMLInputElement>) => setInvitationLabel([...event.target.value].slice(0, 30).join("")), []);
  const handleAnswerChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => setAnswer(event.target.value), []);
  const handleDisconnectMessageChange = useCallback((event: ChangeEvent<HTMLInputElement>) => setDisconnectMessage([...event.target.value].slice(0, 120).join("")), []);
  const handleCreate = useCallback(() => { setNotice(undefined); void sharing.createInvitation(access, ice, invitationLabel); }, [access, ice, invitationLabel, sharing]);
  const handleCreateAnother = useCallback(() => { setAnswer(""); setNotice(undefined); void sharing.createInvitation(access, ice, invitationLabel); }, [access, ice, invitationLabel, sharing]);
  const handleDisconnectAll = useCallback(() => {
    setNotice(undefined);
    void sharing.disconnectAll(disconnectMessage).then(() => setDisconnectMessage(""));
  }, [disconnectMessage, sharing]);
  const handleApply = useCallback(() => {
    setNotice(undefined);
    void sharing.applyAnswer(answer).catch(() => undefined);
  }, [answer, sharing]);
  const handleCopy = useCallback(() => {
    if (!sharing.invitationUrl) return;
    void copyShareText(sharing.invitationUrl).then(() => {
      setCopyTooltipOpen(true);
      if (copyTooltipTimerRef.current !== undefined) window.clearTimeout(copyTooltipTimerRef.current);
      copyTooltipTimerRef.current = window.setTimeout(() => setCopyTooltipOpen(false), 1600);
    }).catch((error: unknown) => setNotice(error instanceof Error ? error.message : String(error)));
  }, [sharing.invitationUrl]);
  const handleShare = useCallback(() => {
    if (!sharing.invitationUrl) return;
    void shareUrl("ERDSketch collaboration invitation", sharing.invitationUrl).catch((error: unknown) => {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setNotice(error instanceof Error ? error.message : String(error));
    });
  }, [sharing.invitationUrl]);

  if (!sharing.hostDialogOpen) return null;
  return <div className="modal modal-open" role="dialog" aria-modal="true" aria-labelledby="share-work-title">
    <div className="modal-box flex h-[min(82vh,640px)] max-w-2xl flex-col rounded-xl bg-white p-0">
      <header className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
        <div><p className="text-xs font-bold uppercase tracking-wide text-blue-700">Peer-to-peer collaboration</p><h2 id="share-work-title" className="text-xl font-bold">{invitationStep ? "Share invitation" : "Create invitation"}</h2><p className="mt-1 text-sm text-slate-500">{invitationStep ? "Send this invitation to one collaborator." : "Choose how the collaborator can connect."}</p></div>
        <button type="button" className="btn btn-ghost btn-sm btn-square" onClick={sharing.closeHostDialog} aria-label="Close Co-work"><X size={18} /></button>
      </header>
      <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-3 text-xs font-semibold" aria-label={`Step ${invitationStep ? 2 : 1} of 2`}>
        <span className={invitationStep ? "text-slate-400" : "text-blue-700"}>1. Connection</span><span className="h-px flex-1 bg-slate-200" /><span className={invitationStep ? "text-blue-700" : "text-slate-400"}>2. Invitation</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        {!invitationStep && <div className="space-y-5">
          <label className="form-control w-full"><span className="label-text mb-1 text-sm font-semibold">Invitation label <span className="font-normal text-slate-400">(optional)</span></span><input className="input input-bordered w-full" value={invitationLabel} onChange={handleInvitationLabelChange} placeholder="Model, project, or your name" aria-describedby="invitation-label-count" /><span id="invitation-label-count" className="mt-1 text-right text-xs text-slate-400">{[...invitationLabel].length}/30</span></label>
          <label className="form-control w-full"><span className="label-text mb-1 text-sm font-semibold">Access</span><select className="select select-bordered w-full" value={access} onChange={handleAccessChange}><option value="edit">Can edit</option><option value="readonly">View only</option></select></label>
          <IceServerFields value={ice} onChange={handleIceChange} />
          {validationError && <p className="text-sm text-error">{validationError}</p>}
          <button type="button" className="btn btn-primary w-full gap-2" onClick={handleCreate} disabled={Boolean(validationError)}><Share2 size={17} />Create invitation</button>
          {sharing.hostError && <div className="alert alert-error text-sm">{sharing.hostError}</div>}
        </div>}
        {invitationStep && !sharing.invitationUrl && <div className="flex h-full min-h-56 flex-col items-center justify-center gap-4 text-center"><span className="loading loading-spinner loading-lg text-primary" /><div><h3 className="font-bold">Creating invitation…</h3><p className="mt-1 text-sm text-slate-500">Gathering WebRTC connection information.</p></div></div>}
        {sharing.invitationUrl && <section className="space-y-4">
          <div><h3 className="font-bold text-blue-950">1. Send this invitation URL</h3>{sharing.hostInvitationLabel && <p className="mt-1 text-sm font-medium text-blue-900">{sharing.hostInvitationLabel}</p>}<p className="text-xs text-blue-800">Keep this tab and dialog open while the participant prepares an answer. Each invitation connects one collaborator.</p></div>
          <textarea className="textarea textarea-bordered h-24 w-full break-all bg-white font-mono text-xs" readOnly value={sharing.invitationUrl} aria-label="Invitation URL" />
          <div className="flex flex-wrap gap-2"><div className={copyTooltipOpen ? "tooltip tooltip-open" : ""} data-tip={copyTooltipOpen ? "Invitation URL copied" : undefined}><button type="button" className="btn btn-outline btn-sm gap-2" onClick={handleCopy}><Copy size={15} />Copy</button></div>{typeof navigator.share === "function" && <button type="button" className="btn btn-outline btn-sm gap-2" onClick={handleShare}><Send size={15} />Share</button>}</div>
          <div className="border-t border-blue-200 pt-4"><h3 className="font-bold text-blue-950">2. Open the returned #as= URL in another tab</h3><p className="mt-1 text-xs text-blue-800">The answer will be delivered to this tab automatically. Do not replace or reload this tab.</p></div>
          <label className="form-control"><span className="label-text mb-1 text-xs font-semibold text-blue-950">Manual fallback: paste answer URL or token</span><textarea className="textarea textarea-bordered h-20 bg-white font-mono text-xs" value={answer} onChange={handleAnswerChange} /></label>
          <button type="button" className="btn btn-secondary btn-sm gap-2" onClick={handleApply} disabled={!answer.trim() || sharing.hostStatus === "connecting"}><Check size={15} />Apply answer</button>
          {sharing.hostError && <div className="alert alert-error text-sm">{sharing.hostError}</div>}
          {notice && <div className="alert alert-info text-sm">{notice}</div>}
          {sharing.hostStatus === "connected" && <div className="alert alert-success text-sm"><Check size={18} />Connected. {sharing.connectedPeerCount} WebRTC peer{sharing.connectedPeerCount === 1 ? "" : "s"} online.</div>}
          {sharing.connectedPeerCount > 0 && <div className="space-y-3 border-t border-slate-200 pt-4">
            <button type="button" className="btn btn-outline btn-sm w-full gap-2" onClick={handleCreateAnother} disabled={busy}><UserPlus size={15} />Invite another collaborator</button>
            <label className="form-control"><span className="label-text mb-1 text-xs font-semibold text-slate-600">Message shown when disconnecting <span className="font-normal text-slate-400">(optional)</span></span><input className="input input-bordered input-sm w-full" value={disconnectMessage} onChange={handleDisconnectMessageChange} placeholder="Thanks — this Co-work session has ended." /><span className="mt-1 text-right text-xs text-slate-400">{[...disconnectMessage].length}/120</span></label>
            <button type="button" className="btn btn-error btn-outline btn-sm w-full gap-2" onClick={handleDisconnectAll}><Unplug size={15} />Disconnect all</button>
          </div>}
        </section>}
      </div>
    </div>
    <button className="modal-backdrop" onClick={sharing.closeHostDialog} aria-label="Close Co-work" />
  </div>;
}
