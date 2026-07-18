import { Copy, Send, Unplug, UserRoundCheck, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { WebRtcSharingController } from "../../collaboration/webrtc/useWebRtcSharing";
import { defaultIceServerProfile, validateIceServerProfile, type IceServerProfile } from "../../collaboration/webrtc/ice";
import { IceServerFields } from "./IceServerFields";
import { copyShareText, shareUrl } from "./shareActions";
import { GuidedTourButton } from "../guidedTour/GuidedTourButton";
import { GuidedTourTrigger } from "../guidedTour/GuidedTourTrigger";

type JoinSharedWorkDialogProps = { sharing: WebRtcSharingController };

export function JoinSharedWorkDialog({ sharing }: JoinSharedWorkDialogProps) {
  const [ice, setIce] = useState<IceServerProfile>(defaultIceServerProfile);
  const [notice, setNotice] = useState<string>();
  const [copyTooltipOpen, setCopyTooltipOpen] = useState(false);
  const copyTooltipTimerRef = useRef<number | undefined>(undefined);
  const validationError = validateIceServerProfile(ice);
  const busy = sharing.joinStatus === "gathering";

  useEffect(() => () => {
    if (copyTooltipTimerRef.current !== undefined) window.clearTimeout(copyTooltipTimerRef.current);
  }, []);

  const handleIceChange = useCallback((value: IceServerProfile) => setIce(value), []);
  const handleAccept = useCallback(() => { setNotice(undefined); void sharing.acceptInvitation(ice); }, [ice, sharing]);
  const handleCopy = useCallback(() => {
    if (!sharing.answerUrl) return;
    void copyShareText(sharing.answerUrl).then(() => {
      setCopyTooltipOpen(true);
      if (copyTooltipTimerRef.current !== undefined) window.clearTimeout(copyTooltipTimerRef.current);
      copyTooltipTimerRef.current = window.setTimeout(() => setCopyTooltipOpen(false), 1600);
    }).catch((error: unknown) => setNotice(error instanceof Error ? error.message : String(error)));
  }, [sharing.answerUrl]);
  const handleShare = useCallback(() => {
    if (!sharing.answerUrl) return;
    void shareUrl("ERDSketch collaboration answer", sharing.answerUrl).catch((error: unknown) => {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setNotice(error instanceof Error ? error.message : String(error));
    });
  }, [sharing.answerUrl]);

  if (!sharing.hasInvitation || sharing.joinStatus === "connected" || sharing.participantDisconnectReason) return null;
  return <div data-tour="collaboration-dialog" className="modal modal-open" role="dialog" aria-modal="true" aria-labelledby="join-shared-work-title">
    <GuidedTourTrigger tour="collaboration" />
    <div className="modal-box flex h-[min(82vh,640px)] max-w-2xl flex-col rounded-xl bg-white p-0">
      <header className="flex items-start justify-between border-b border-slate-200 px-6 py-4"><div><p className="text-xs font-bold uppercase tracking-wide text-violet-700">WebRTC invitation</p><h2 id="join-shared-work-title" className="text-xl font-bold">{sharing.disconnectNotice ? "Co-work ended" : sharing.answerUrl ? "Share answer" : "Join Co-work"}</h2>{!sharing.disconnectNotice && <><p className="mt-1 text-sm text-slate-500">Requested access: <strong>{sharing.requestedAccess === "readonly" ? "View only" : "Can edit"}</strong></p>{sharing.invitationLabel && <p className="mt-1 text-sm font-semibold text-violet-800">{sharing.invitationLabel}</p>}</>}</div><div className="flex items-center gap-1"><GuidedTourButton tour="collaboration" label="Co-work" compact /><button type="button" className="btn btn-ghost btn-sm btn-square" onClick={sharing.cancelInvitationJoin} aria-label="Cancel joining"><X size={18} /></button></div></header>
      {!sharing.disconnectNotice && <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-3 text-xs font-semibold" aria-label={`Step ${sharing.answerUrl ? 2 : 1} of 2`}><span className={sharing.answerUrl ? "text-slate-400" : "text-violet-700"}>1. Connection</span><span className="h-px flex-1 bg-slate-200" /><span className={sharing.answerUrl ? "text-violet-700" : "text-slate-400"}>2. Answer</span></div>}
      <div data-tour="collaboration-connection" className="min-h-0 flex-1 space-y-5 overflow-y-auto p-6">
        {sharing.disconnectNotice && <div className="flex h-full min-h-64 flex-col items-center justify-center gap-4 text-center"><span className="rounded-full bg-slate-100 p-4 text-slate-500"><Unplug size={28} /></span><div><h3 className="font-bold">The host disconnected everyone.</h3><p className="mt-2 max-w-md whitespace-pre-wrap text-sm text-slate-600">{sharing.disconnectNotice}</p></div><button type="button" className="btn btn-primary btn-sm" onClick={sharing.cancelInvitationJoin}>Leave Co-work</button></div>}
        {!sharing.disconnectNotice && !sharing.answerUrl && <><IceServerFields value={ice} onChange={handleIceChange} disabled={busy} />{validationError && <p className="text-sm text-error">{validationError}</p>}<button type="button" className="btn btn-primary w-full gap-2" onClick={handleAccept} disabled={busy || sharing.joinStatus === "failed" || Boolean(validationError)}><UserRoundCheck size={17} />{busy ? "Preparing answer…" : "Prepare answer URL"}</button></>}
        {sharing.answerUrl && <section className="space-y-4"><div><h3 className="font-bold text-violet-950">Send this answer URL back to the host</h3><p className="mt-1 text-xs text-violet-800">Keep this page open. The host must open the URL in a separate tab or window while their original Co-work dialog remains open.</p></div><textarea className="textarea textarea-bordered h-28 w-full bg-white font-mono text-xs" readOnly value={sharing.answerUrl} aria-label="Answer URL" /><div className="flex gap-2"><div className={copyTooltipOpen ? "tooltip tooltip-open" : ""} data-tip={copyTooltipOpen ? "Answer URL copied" : undefined}><button type="button" className="btn btn-outline btn-sm gap-2" onClick={handleCopy}><Copy size={15} />Copy</button></div>{typeof navigator.share === "function" && <button type="button" className="btn btn-outline btn-sm gap-2" onClick={handleShare}><Send size={15} />Share</button>}</div><p className="text-sm font-medium text-violet-950">Waiting for the host to apply the answer…</p></section>}
        {!sharing.disconnectNotice && sharing.joinError && <div className="alert alert-error text-sm">{sharing.joinError}</div>}
        {!sharing.disconnectNotice && notice && <div className="alert alert-info text-sm">{notice}</div>}
      </div>
    </div>
  </div>;
}
