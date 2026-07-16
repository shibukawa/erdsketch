export type IceServerProfile =
  | { kind: "google"; url: string }
  | { kind: "custom-stun"; urls: string }
  | { kind: "custom-turn"; urls: string; username: string; credential: string };

export const googleStunUrls = [
  "stun:stun.l.google.com:19302",
  "stun:stun1.l.google.com:19302",
  "stun:stun2.l.google.com:19302",
  "stun:stun3.l.google.com:19302",
  "stun:stun4.l.google.com:19302"
];

export function defaultIceServerProfile(): IceServerProfile {
  return { kind: "google", url: googleStunUrls[0] };
}

function splitUrls(value: string) {
  return value.split(/[\s,]+/).map((url) => url.trim()).filter(Boolean);
}

export function validateIceServerProfile(profile: IceServerProfile) {
  if (profile.kind === "google") return googleStunUrls.includes(profile.url) ? undefined : "Select a built-in Google STUN server.";
  const urls = splitUrls(profile.urls);
  if (urls.length === 0) return "Enter at least one ICE server URL.";
  const schemes = profile.kind === "custom-stun" ? ["stun:", "stuns:"] : ["turn:", "turns:"];
  if (urls.some((url) => !schemes.some((scheme) => url.startsWith(scheme)))) {
    return profile.kind === "custom-stun" ? "STUN URLs must start with stun: or stuns:." : "TURN URLs must start with turn: or turns:.";
  }
  if (urls.some((url) => /^\w+:\/\/[^/]*@/.test(url))) return "Credentials must not be embedded in an ICE server URL.";
  if (profile.kind === "custom-turn" && (!profile.username.trim() || !profile.credential)) return "TURN username and credential are required.";
  return undefined;
}

export function toRtcConfiguration(profile: IceServerProfile): RTCConfiguration {
  const validationError = validateIceServerProfile(profile);
  if (validationError) throw new Error(validationError);
  if (profile.kind === "google") return { iceServers: [{ urls: profile.url }] };
  if (profile.kind === "custom-stun") return { iceServers: [{ urls: splitUrls(profile.urls) }] };
  return { iceServers: [{ urls: splitUrls(profile.urls), username: profile.username.trim(), credential: profile.credential }] };
}
