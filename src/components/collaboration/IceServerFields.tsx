import { useCallback, type ChangeEvent } from "react";
import { googleStunUrls, type IceServerProfile } from "../../collaboration/webrtc/ice";

type IceServerFieldsProps = {
  value: IceServerProfile;
  onChange: (value: IceServerProfile) => void;
  disabled?: boolean;
};

export function IceServerFields({ value, onChange, disabled = false }: IceServerFieldsProps) {
  const handleKindChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    const kind = event.target.value;
    if (kind === "custom-stun") onChange({ kind, urls: "" });
    else if (kind === "custom-turn") onChange({ kind, urls: "", username: "", credential: "" });
    else onChange({ kind: "google", url: googleStunUrls[0] });
  }, [onChange]);

  const handleFieldChange = useCallback((event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const field = event.target.name;
    if (value.kind === "google") {
      if (field === "googleUrl") onChange({ ...value, url: event.target.value });
      return;
    }
    if (value.kind === "custom-stun") {
      if (field === "urls") onChange({ ...value, urls: event.target.value });
      return;
    }
    if (field === "urls" || field === "username" || field === "credential") onChange({ ...value, [field]: event.target.value });
  }, [onChange, value]);

  return <fieldset className="space-y-3" disabled={disabled}>
    <label className="form-control w-full">
      <span className="label-text mb-1 text-sm font-semibold">ICE servers</span>
      <select className="select select-bordered w-full" value={value.kind} onChange={handleKindChange}>
        <option value="google">Google STUN (default)</option>
        <option value="custom-stun">Custom STUN</option>
        <option value="custom-turn">Custom TURN</option>
      </select>
    </label>
    {value.kind === "google" && <label className="form-control w-full">
      <span className="label-text mb-1 text-sm font-semibold">Google STUN server</span>
      <select name="googleUrl" className="select select-bordered w-full font-mono text-sm" value={value.url} onChange={handleFieldChange}>
        {googleStunUrls.map((url) => <option key={url} value={url}>{url}</option>)}
      </select>
    </label>}
    {value.kind !== "google" && <label className="form-control w-full">
      <span className="label-text mb-1 text-sm font-semibold">{value.kind === "custom-stun" ? "STUN URL" : "TURN URL"}</span>
      <input name="urls" className="input input-bordered w-full font-mono text-sm" value={value.urls} onChange={handleFieldChange} placeholder={value.kind === "custom-stun" ? "stun:stun.example.com:3478" : "turn:turn.example.com:3478"} />
      <span className="mt-1 text-xs text-slate-500">Separate multiple URLs with spaces or commas.</span>
    </label>}
    {value.kind === "custom-turn" && <div className="grid gap-3 sm:grid-cols-2">
      <label className="form-control"><span className="label-text mb-1 text-sm font-semibold">Username</span><input name="username" className="input input-bordered" value={value.username} onChange={handleFieldChange} autoComplete="off" /></label>
      <label className="form-control"><span className="label-text mb-1 text-sm font-semibold">Credential</span><input name="credential" type="password" className="input input-bordered" value={value.credential} onChange={handleFieldChange} autoComplete="off" /></label>
    </div>}
  </fieldset>;
}
