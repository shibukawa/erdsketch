import { Check, Copy, ExternalLink } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { cleanupExpiredAnswerMailboxes, decodeShareToken } from "../../collaboration/webrtc/shareToken";
import { writeAnswerMailbox } from "../../collaboration/webrtc/useWebRtcSharing";
import { copyShareText } from "./shareActions";

type AnswerRelayPageProps = { token: string; originalUrl: string };
type RelayStatus = "delivering" | "delivered" | "waiting" | "failed";

export function AnswerRelayPage({ token, originalUrl }: AnswerRelayPageProps) {
  const [status, setStatus] = useState<RelayStatus>("delivering");
  const [error, setError] = useState<string>();
  const [mailboxKey, setMailboxKey] = useState<string>();
  const [notice, setNotice] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    cleanupExpiredAnswerMailboxes();
    void decodeShareToken(token, "answer").then((answer) => {
      if (cancelled) return;
      const key = writeAnswerMailbox(answer, token, crypto.randomUUID());
      setMailboxKey(key);
      setStatus("waiting");
    }).catch((reason: unknown) => {
      if (cancelled) return;
      setStatus("failed");
      setError(reason instanceof Error ? reason.message : String(reason));
    });
    return () => { cancelled = true; };
  }, [token]);

  useEffect(() => {
    if (!mailboxKey) return;
    const handleStorage = (event: StorageEvent) => {
      if (event.key === mailboxKey && event.newValue === null) setStatus("delivered");
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [mailboxKey]);

  const handleCopy = useCallback(() => {
    void copyShareText(originalUrl).then(() => setNotice("Answer URL copied.")).catch((reason: unknown) => setNotice(reason instanceof Error ? reason.message : String(reason)));
  }, [originalUrl]);
  const handleClose = useCallback(() => window.close(), []);

  return <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6 text-slate-950"><section className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-7 shadow-2xl"><p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">ERDSketch WebRTC</p><h1 className="mt-2 text-2xl font-bold">Deliver collaboration answer</h1>
    {status === "delivering" && <p className="mt-5 text-slate-600">Validating the answer…</p>}
    {status === "waiting" && <div className="mt-5 space-y-3"><p className="font-semibold">Waiting for the original host tab.</p><p className="text-sm text-slate-600">Keep the original Share work dialog open in another tab or window. This page is notifying it through same-origin browser storage.</p></div>}
    {status === "delivered" && <div className="alert alert-success mt-5"><Check size={20} /><span>The answer reached the original host tab. Connection setup is continuing there.</span></div>}
    {status === "failed" && <div className="alert alert-error mt-5"><span>{error ?? "The answer URL is invalid."}</span></div>}
    {status !== "delivered" && <div className="mt-5 rounded-xl bg-slate-50 p-4"><p className="text-sm font-semibold">Manual fallback</p><p className="mt-1 text-xs text-slate-600">Copy this URL and paste it into the original Share work dialog. Replacing the original host tab will cancel the pending connection.</p><button type="button" className="btn btn-outline btn-sm mt-3 gap-2" onClick={handleCopy}><Copy size={15} />Copy answer URL</button></div>}
    {notice && <p className="mt-3 text-sm text-blue-700">{notice}</p>}
    <div className="mt-6 flex justify-end"><button type="button" className="btn btn-primary gap-2" onClick={handleClose}><ExternalLink size={16} />Close this tab</button></div>
  </section></main>;
}
