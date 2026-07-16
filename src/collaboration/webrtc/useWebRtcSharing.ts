import { startTransition, useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import type { Collaborator, RelayMessage } from "../types";
import { FramedDataChannel } from "./framedChannel";
import type { IceServerProfile } from "./ice";
import { toRtcConfiguration } from "./ice";
import { answerMailboxKey, answerMailboxPrefix, createSessionId, createShareUrl, decodeShareToken, encodeShareToken, extractShareTokenPrefix, type ShareToken } from "./shareToken";
import { beginParticipantCheckpointSession, clearParticipantCheckpoint } from "./participantCheckpoint";

export type ShareAccess = "edit" | "readonly";
export type HostShareStatus = "idle" | "gathering" | "waiting-for-answer" | "connecting" | "connected" | "failed";
export type JoinShareStatus = "review" | "gathering" | "waiting-for-host" | "connected" | "failed";

export type WebRtcSharingState = {
  hostDialogOpen: boolean;
  hostStatus: HostShareStatus;
  invitationUrl?: string;
  hostInvitationLabel?: string;
  hostError?: string;
  joinStatus?: JoinShareStatus;
  requestedAccess?: ShareAccess;
  invitationLabel?: string;
  answerUrl?: string;
  joinError?: string;
  disconnectNotice?: string;
  participantDisconnectReason?: string;
  participantDisconnectedAt?: number;
  connectedPeerCount: number;
};

export type WebRtcSharingController = WebRtcSharingState & {
  hasInvitation: boolean;
  openHostDialog: () => void;
  closeHostDialog: () => void;
  createInvitation: (access: ShareAccess, ice: IceServerProfile, label?: string) => Promise<void>;
  applyAnswer: (answerUrlOrToken: string) => Promise<void>;
  disconnectAll: (message?: string) => Promise<void>;
  acceptInvitation: (ice: IceServerProfile) => Promise<void>;
  detachParticipant: () => void;
  cancelInvitationJoin: () => void;
};

type OutgoingMessage<T> = Omit<RelayMessage<T>, "senderId">;
type SendFunction<T> = (message: OutgoingMessage<T>) => Promise<boolean>;

type HostPeer<T> = {
  sessionId: string;
  access: ShareAccess;
  pc: RTCPeerConnection;
  channel: RTCDataChannel;
  framed?: FramedDataChannel<RelayMessage<T>>;
  participantId?: string;
  answered: boolean;
  expires: number;
};

type InvitationOptions = { access: ShareAccess; ice: IceServerProfile; label?: string };

type ParticipantPeer<T> = {
  pc: RTCPeerConnection;
  framed?: FramedDataChannel<RelayMessage<T>>;
  token: ShareToken;
  heartbeatTimer?: number;
  lastPongAt?: number;
  visibilityHandler?: () => void;
};

type UseWebRtcSharingOptions<T> = {
  me: Collaborator;
  initialInvitationToken?: string;
  onMessage: (message: RelayMessage<T>) => void;
  onParticipantConnectionChange: (connected: boolean) => void;
  sendRef: React.MutableRefObject<SendFunction<T>>;
  availableRef: React.MutableRefObject<boolean>;
};

const invitationLifetimeMs = 10 * 60 * 1000;
const iceGatheringTimeoutMs = 20_000;
const heartbeatIntervalMs = 5_000;
const heartbeatTimeoutMs = 15_000;

function stopParticipantHeartbeat<T>(participant?: ParticipantPeer<T>) {
  if (!participant) return;
  if (participant.heartbeatTimer !== undefined) window.clearInterval(participant.heartbeatTimer);
  if (participant.visibilityHandler) document.removeEventListener("visibilitychange", participant.visibilityHandler);
  participant.heartbeatTimer = undefined;
  participant.visibilityHandler = undefined;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function waitForIceGathering(pc: RTCPeerConnection) {
  if (pc.iceGatheringState === "complete") return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => { cleanup(); reject(new Error("ICE gathering timed out. Check the STUN or TURN configuration.")); }, iceGatheringTimeoutMs);
    const handleChange = () => {
      if (pc.iceGatheringState !== "complete") return;
      cleanup();
      resolve();
    };
    const cleanup = () => {
      window.clearTimeout(timer);
      pc.removeEventListener("icegatheringstatechange", handleChange);
    };
    pc.addEventListener("icegatheringstatechange", handleChange);
    handleChange();
  });
}

function extractAnswerToken(value: string) {
  const trimmed = value.trim();
  try {
    const url = new URL(trimmed);
    const match = url.hash.match(/^#as=(.*)$/s);
    if (!match) throw new Error("The URL does not contain an #as= answer.");
    return extractShareTokenPrefix(match[1]);
  } catch (error) {
    try {
      return extractShareTokenPrefix(trimmed);
    } catch {
      // Prefer the URL-specific validation error when the input was a URL.
    }
    throw error;
  }
}

export function useWebRtcSharing<T>(options: UseWebRtcSharingOptions<T>): WebRtcSharingController {
  const [state, setState] = useState<WebRtcSharingState>({
    hostDialogOpen: false,
    hostStatus: "idle",
    joinStatus: options.initialInvitationToken ? "review" : undefined,
    connectedPeerCount: 0
  });
  const hostPeersRef = useRef(new Map<string, HostPeer<T>>());
  const participantRef = useRef<ParticipantPeer<T> | undefined>(undefined);
  const invitationRef = useRef<ShareToken | undefined>(undefined);
  const invitationTokenRef = useRef(options.initialInvitationToken);
  const lastInvitationOptionsRef = useRef<InvitationOptions | undefined>(undefined);
  const onMessage = useEffectEvent(options.onMessage);
  const onParticipantConnectionChange = useEffectEvent(options.onParticipantConnectionChange);

  const updatePeerCount = useCallback(() => {
    const connectedPeerCount = [...hostPeersRef.current.values()].filter((peer) => peer.channel.readyState === "open").length;
    startTransition(() => setState((current) => ({ ...current, connectedPeerCount })));
  }, []);

  const sendToHostPeer = useCallback(async (peer: HostPeer<T>, message: RelayMessage<T>) => {
    if (!peer.framed || peer.channel.readyState !== "open") return false;
    await peer.framed.send(message);
    return true;
  }, []);

  const bindHostChannel = useCallback((peer: HostPeer<T>) => {
    peer.framed = new FramedDataChannel(peer.channel, (message) => {
      if (!message || typeof message !== "object" || typeof message.kind !== "string" || typeof message.senderId !== "string") return;
      if (message.kind === "transport_ping") {
        void sendToHostPeer(peer, { kind: "transport_pong", senderId: options.me.id, targetId: message.senderId });
        return;
      }
      if (message.kind === "participant_joined") peer.participantId = message.senderId;
      if (peer.access === "readonly" && message.kind === "operation_intent") {
        const payload = message.payload as { requestId?: string } | undefined;
        void sendToHostPeer(peer, {
          kind: "operation_rejected",
          senderId: options.me.id,
          targetId: message.senderId,
          messageId: payload?.requestId,
          payload: { requestId: payload?.requestId, error: "This collaboration invitation is readonly." }
        });
        return;
      }
      onMessage(message);
    });
    peer.channel.addEventListener("open", () => {
      updatePeerCount();
      startTransition(() => setState((current) => ({ ...current, hostStatus: "connected", hostError: undefined })));
    });
    peer.channel.addEventListener("close", () => {
      peer.framed?.dispose();
      hostPeersRef.current.delete(peer.sessionId);
      updatePeerCount();
      if (peer.participantId) onMessage({ kind: "participant_left", senderId: peer.participantId, payload: { clientId: peer.participantId } });
    });
  }, [onMessage, options.me.id, sendToHostPeer, updatePeerCount]);

  const send = useCallback<SendFunction<T>>(async (message) => {
    const withSender = { ...message, senderId: options.me.id } as RelayMessage<T>;
    const participant = participantRef.current;
    if (participant?.framed?.channel.readyState === "open") {
      await participant.framed.send(withSender);
      return true;
    }
    const peers = [...hostPeersRef.current.values()].filter((peer) => peer.framed?.channel.readyState === "open" && (!message.targetId || peer.participantId === message.targetId));
    if (peers.length === 0) return false;
    const results = await Promise.allSettled(peers.map((peer) => peer.framed!.send(withSender)));
    return results.some((result) => result.status === "fulfilled");
  }, [options.me.id]);
  options.sendRef.current = send;

  useEffect(() => {
    const token = invitationTokenRef.current;
    if (!token) return;
    let cancelled = false;
    void decodeShareToken(token, "invitation").then((invitation) => {
      if (cancelled) return;
      invitationRef.current = invitation;
      beginParticipantCheckpointSession(invitation.sessionId, invitation.readonly ? "readonly" : "edit", invitation.label);
      startTransition(() => setState((current) => ({ ...current, joinStatus: "review", requestedAccess: invitation.readonly ? "readonly" : "edit", invitationLabel: invitation.label, joinError: undefined })));
    }).catch((error: unknown) => {
      if (!cancelled) startTransition(() => setState((current) => ({ ...current, joinStatus: "failed", joinError: errorMessage(error) })));
    });
    return () => { cancelled = true; };
  }, []);

  const closeHostDialog = useCallback(() => {
    for (const [sessionId, peer] of hostPeersRef.current) {
      if (peer.channel.readyState === "open") continue;
      peer.framed?.dispose();
      peer.pc.close();
      hostPeersRef.current.delete(sessionId);
    }
    setState((current) => ({
      ...current,
      hostDialogOpen: false,
      hostStatus: current.connectedPeerCount > 0 ? "connected" : "idle",
      invitationUrl: undefined,
      hostInvitationLabel: undefined,
      hostError: undefined
    }));
  }, []);

  const createInvitation = useCallback(async (access: ShareAccess, ice: IceServerProfile, rawLabel?: string) => {
    const label = rawLabel?.trim() || undefined;
    if (label && [...label].length > 30) {
      startTransition(() => setState((current) => ({ ...current, hostStatus: "failed", hostError: "Invitation label must be 30 characters or fewer." })));
      return;
    }
    lastInvitationOptionsRef.current = { access, ice, label };
    startTransition(() => setState((current) => ({ ...current, hostStatus: "gathering", invitationUrl: undefined, hostInvitationLabel: label, hostError: undefined })));
    let pc: RTCPeerConnection | undefined;
    let sessionId: string | undefined;
    try {
      pc = new RTCPeerConnection(toRtcConfiguration(ice));
      const channel = pc.createDataChannel("erdsketch-collaboration-v1", { ordered: true });
      sessionId = createSessionId();
      const peer: HostPeer<T> = { sessionId, access, pc, channel, answered: false, expires: Date.now() + invitationLifetimeMs };
      bindHostChannel(peer);
      hostPeersRef.current.set(sessionId, peer);
      await pc.setLocalDescription(await pc.createOffer());
      await waitForIceGathering(pc);
      if (!pc.localDescription?.sdp) throw new Error("The browser did not create an SDP offer.");
      const token = await encodeShareToken({ kind: "invitation", readonly: access === "readonly", sessionId, label, sdp: pc.localDescription.sdp });
      const invitationUrl = createShareUrl("invitation", token);
      startTransition(() => setState((current) => ({ ...current, hostStatus: "waiting-for-answer", invitationUrl })));
      window.setTimeout(() => {
        const current = hostPeersRef.current.get(peer.sessionId);
        if (!current || current.participantId || current.channel.readyState === "open") return;
        current.framed?.dispose();
        current.pc.close();
        hostPeersRef.current.delete(peer.sessionId);
        startTransition(() => setState((value) => value.invitationUrl === invitationUrl ? { ...value, hostStatus: "failed", hostError: "The invitation expired. Create a new invitation." } : value));
      }, invitationLifetimeMs);
    } catch (error) {
      pc?.close();
      if (sessionId) hostPeersRef.current.delete(sessionId);
      startTransition(() => setState((current) => ({ ...current, hostStatus: "failed", hostError: errorMessage(error) })));
    }
  }, [bindHostChannel]);

  const openHostDialog = useCallback(() => {
    const hasConnectedPeer = [...hostPeersRef.current.values()].some((peer) => peer.channel.readyState === "open");
    setState((current) => ({ ...current, hostDialogOpen: true, hostError: undefined }));
    const previous = lastInvitationOptionsRef.current;
    if (hasConnectedPeer && previous) void createInvitation(previous.access, previous.ice, previous.label);
  }, [createInvitation]);

  const applyAnswerToken = useCallback(async (rawToken: string) => {
    const answer = await decodeShareToken(rawToken, "answer");
    const peer = hostPeersRef.current.get(answer.sessionId);
    if (!peer || peer.expires < Date.now()) throw new Error("The answer does not match a live invitation in this tab.");
    if (peer.answered || peer.pc.remoteDescription) throw new Error("This invitation has already accepted an answer. Create another invitation for the next collaborator.");
    if ((peer.access === "readonly") !== answer.readonly) throw new Error("The answer access mode does not match the invitation.");
    peer.answered = true;
    startTransition(() => setState((current) => ({ ...current, hostStatus: "connecting", hostError: undefined })));
    try {
      await peer.pc.setRemoteDescription({ type: "answer", sdp: answer.sdp });
      startTransition(() => setState((current) => ({
        ...current,
        hostDialogOpen: false,
        hostStatus: "connecting",
        invitationUrl: undefined,
        hostInvitationLabel: undefined,
        hostError: undefined
      })));
    } catch (error) {
      peer.answered = false;
      throw error;
    }
  }, []);

  const applyAnswer = useCallback(async (answerUrlOrToken: string) => {
    try {
      await applyAnswerToken(extractAnswerToken(answerUrlOrToken));
    } catch (error) {
      startTransition(() => setState((current) => ({ ...current, hostStatus: "failed", hostError: errorMessage(error) })));
      throw error;
    }
  }, [applyAnswerToken]);

  const disconnectAll = useCallback(async (rawMessage?: string) => {
    const message = [...(rawMessage?.trim() ?? "")].slice(0, 120).join("");
    const peers = [...hostPeersRef.current.values()];
    await Promise.allSettled(peers.filter((peer) => peer.framed?.channel.readyState === "open").map((peer) => peer.framed!.send({
      kind: "session_closing",
      senderId: options.me.id,
      payload: message ? { message } : {}
    })));
    for (const peer of peers) {
      peer.framed?.dispose();
      peer.pc.close();
    }
    hostPeersRef.current.clear();
    startTransition(() => setState((current) => ({
      ...current,
      hostStatus: "idle",
      invitationUrl: undefined,
      hostInvitationLabel: undefined,
      hostError: undefined,
      connectedPeerCount: 0
    })));
  }, [options.me.id]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (!event.key?.startsWith(answerMailboxPrefix) || !event.newValue) return;
      let token: string | undefined;
      try {
        const value = JSON.parse(event.newValue) as { t?: unknown; c?: unknown };
        if (typeof value.t !== "string" || typeof value.c !== "number" || Date.now() - value.c > invitationLifetimeMs) return;
        token = value.t;
      } catch {
        return;
      }
      void applyAnswerToken(token).then(() => window.localStorage.removeItem(event.key!)).catch((error: unknown) => {
        startTransition(() => setState((current) => ({ ...current, hostStatus: "failed", hostError: errorMessage(error) })));
      });
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [applyAnswerToken]);

  const markParticipantDisconnected = useCallback((reason: string) => {
    options.availableRef.current = false;
    onParticipantConnectionChange(false);
    startTransition(() => setState((current) => current.participantDisconnectReason ? current : {
      ...current,
      joinStatus: "failed",
      participantDisconnectReason: reason,
      participantDisconnectedAt: Date.now(),
      joinError: undefined
    }));
  }, [onParticipantConnectionChange, options.availableRef]);

  const acceptInvitation = useCallback(async (ice: IceServerProfile) => {
    const invitation = invitationRef.current;
    if (!invitation) {
      startTransition(() => setState((current) => ({ ...current, joinStatus: "failed", joinError: "The invitation is not ready." })));
      return;
    }
    startTransition(() => setState((current) => ({ ...current, joinStatus: "gathering", joinError: undefined })));
    let pc: RTCPeerConnection | undefined;
    try {
      pc = new RTCPeerConnection(toRtcConfiguration(ice));
      participantRef.current = { pc, token: invitation };
      let disconnectedTimer: number | undefined;
      pc.addEventListener("connectionstatechange", () => {
        if (pc?.connectionState === "connected") {
          if (disconnectedTimer !== undefined) window.clearTimeout(disconnectedTimer);
          disconnectedTimer = undefined;
          return;
        }
        if (pc?.connectionState === "disconnected") {
          if (disconnectedTimer !== undefined) return;
          disconnectedTimer = window.setTimeout(() => {
            disconnectedTimer = undefined;
            if (pc?.connectionState !== "disconnected") return;
            markParticipantDisconnected("The Co-work connection did not recover after the device resumed.");
            pc.close();
          }, 10_000);
          return;
        }
        if (pc?.connectionState === "failed") markParticipantDisconnected("The Co-work peer connection failed.");
        if (pc?.connectionState === "closed" && participantRef.current?.pc === pc) markParticipantDisconnected("The Co-work connection was closed.");
      });
      pc.addEventListener("datachannel", (event) => {
        const framed = new FramedDataChannel<RelayMessage<T>>(event.channel, (message) => {
          if (message.kind === "transport_pong") {
            const participant = participantRef.current;
            if (participant && participant.pc === pc) participant.lastPongAt = Date.now();
            return;
          }
          if (message.kind === "session_closing") {
            const payload = message.payload as { message?: unknown } | undefined;
            const disconnectNotice = typeof payload?.message === "string" && payload.message.trim() ? payload.message.trim() : "The host ended this Co-work session.";
            options.availableRef.current = false;
            onParticipantConnectionChange(false);
            startTransition(() => setState((current) => ({ ...current, joinStatus: "failed", disconnectNotice, participantDisconnectReason: disconnectNotice, participantDisconnectedAt: Date.now(), joinError: undefined })));
            window.setTimeout(() => pc?.close(), 0);
            return;
          }
          onMessage(message);
        });
        const participant = participantRef.current;
        if (!participant || participant.pc !== pc) return;
        participant.framed = framed;
        event.channel.addEventListener("open", () => {
          options.availableRef.current = true;
          onParticipantConnectionChange(true);
          startTransition(() => setState((current) => ({ ...current, joinStatus: "connected", participantDisconnectReason: undefined, participantDisconnectedAt: undefined, joinError: undefined })));
          void framed.send({ kind: "participant_joined", senderId: options.me.id, payload: options.me });
          participant.lastPongAt = Date.now();
          const sendHeartbeat = () => void framed.send({ kind: "transport_ping", senderId: options.me.id }).catch(() => undefined);
          participant.visibilityHandler = () => {
            if (document.visibilityState !== "visible") return;
            participant.lastPongAt = Date.now();
            sendHeartbeat();
          };
          document.addEventListener("visibilitychange", participant.visibilityHandler);
          participant.heartbeatTimer = window.setInterval(() => {
            if (document.visibilityState !== "visible" || participantRef.current !== participant) return;
            if (Date.now() - (participant.lastPongAt ?? 0) > heartbeatTimeoutMs) {
              markParticipantDisconnected("The Co-work host stopped responding after the device resumed.");
              participant.pc.close();
              return;
            }
            sendHeartbeat();
          }, heartbeatIntervalMs);
          sendHeartbeat();
        });
        event.channel.addEventListener("close", () => {
          if (participantRef.current?.pc !== pc) return;
          stopParticipantHeartbeat(participantRef.current);
          framed.dispose();
          markParticipantDisconnected("The Co-work connection was lost.");
        });
      });
      await pc.setRemoteDescription({ type: "offer", sdp: invitation.sdp });
      await pc.setLocalDescription(await pc.createAnswer());
      await waitForIceGathering(pc);
      if (!pc.localDescription?.sdp) throw new Error("The browser did not create an SDP answer.");
      const token = await encodeShareToken({ kind: "answer", readonly: invitation.readonly, sessionId: invitation.sessionId, sdp: pc.localDescription.sdp });
      const answerUrl = createShareUrl("answer", token);
      startTransition(() => setState((current) => ({ ...current, joinStatus: "waiting-for-host", answerUrl })));
    } catch (error) {
      participantRef.current = undefined;
      pc?.close();
      startTransition(() => setState((current) => ({ ...current, joinStatus: "failed", joinError: errorMessage(error) })));
    }
  }, [markParticipantDisconnected, onMessage, onParticipantConnectionChange, options.availableRef, options.me]);

  const detachParticipant = useCallback(() => {
    const participant = participantRef.current;
    participantRef.current = undefined;
    stopParticipantHeartbeat(participant);
    participant?.framed?.dispose();
    participant?.pc.close();
    options.availableRef.current = false;
    onParticipantConnectionChange(false);
    startTransition(() => setState((current) => ({ ...current, joinStatus: undefined, disconnectNotice: undefined, participantDisconnectReason: undefined, participantDisconnectedAt: undefined, joinError: undefined, answerUrl: undefined })));
  }, [onParticipantConnectionChange, options.availableRef]);

  const cancelInvitationJoin = useCallback(() => {
    detachParticipant();
    clearParticipantCheckpoint();
    const url = new URL(window.location.href);
    url.hash = "";
    window.location.assign(url);
  }, [detachParticipant]);

  useEffect(() => () => {
    for (const peer of hostPeersRef.current.values()) {
      peer.framed?.dispose();
      peer.pc.close();
    }
    hostPeersRef.current.clear();
    participantRef.current?.framed?.dispose();
    stopParticipantHeartbeat(participantRef.current);
    participantRef.current?.pc.close();
    options.availableRef.current = false;
  }, [options.availableRef]);

  return {
    ...state,
    hasInvitation: Boolean(options.initialInvitationToken) && state.joinStatus !== undefined,
    openHostDialog,
    closeHostDialog,
    createInvitation,
    applyAnswer,
    disconnectAll,
    acceptInvitation,
    detachParticipant,
    cancelInvitationJoin
  };
}

export function writeAnswerMailbox(token: ShareToken, rawToken: string, pageId: string) {
  const key = answerMailboxKey(token.sessionId);
  window.localStorage.setItem(key, JSON.stringify({ t: rawToken, c: Date.now(), p: pageId }));
  return key;
}
