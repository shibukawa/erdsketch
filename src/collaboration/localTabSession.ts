import type { Collaborator, RelayMessage } from "./types";

const CHANNEL_NAME = "erdsketch:local-project-session:v1";
const PROTOCOL_VERSION = 1 as const;

type LocalSessionMessage<T> =
  | { type: "join_request"; requestId: string; user: Collaborator }
  | { type: "join_accepted"; requestId: string; targetId: string; hostId: string }
  | { type: "relay"; hostId: string; message: RelayMessage<T> }
  | { type: "participant_left"; hostId: string }
  | { type: "host_heartbeat"; hostId: string }
  | { type: "host_closing"; hostId: string };

type LocalSessionEnvelope<T> = {
  protocolVersion: typeof PROTOCOL_VERSION;
  projectId: string;
  senderId: string;
} & LocalSessionMessage<T>;

type BroadcastChannelLike = {
  onmessage: ((event: MessageEvent) => void) | null;
  postMessage(message: unknown): void;
  close(): void;
};

type LocalTabSessionOptions = {
  channelFactory?: (name: string) => BroadcastChannelLike;
  heartbeatMs?: number;
  hostTimeoutMs?: number;
};

export class LocalTabSession<T> {
  private readonly clientId: string;
  private readonly onMessage: (message: RelayMessage<T>) => void;
  private readonly onHostLost: () => void;
  private readonly channel: BroadcastChannelLike;
  private readonly heartbeatMs: number;
  private readonly hostTimeoutMs: number;
  private role: "idle" | "host" | "participant" = "idle";
  private projectId = "";
  private hostId = "";
  private heartbeatTimer: ReturnType<typeof setInterval> | undefined;
  private monitorTimer: ReturnType<typeof setInterval> | undefined;
  private lastHeartbeat = 0;
  private pendingJoin: { requestId: string; resolve(value: boolean): void; timer: ReturnType<typeof setTimeout>; retryTimer: ReturnType<typeof setInterval> } | undefined;

  constructor(
    clientId: string,
    onMessage: (message: RelayMessage<T>) => void,
    onHostLost: () => void,
    options: LocalTabSessionOptions = {}
  ) {
    this.clientId = clientId;
    this.onMessage = onMessage;
    this.onHostLost = onHostLost;
    this.heartbeatMs = options.heartbeatMs ?? 1_500;
    this.hostTimeoutMs = options.hostTimeoutMs ?? 6_000;
    const factory = options.channelFactory ?? ((name) => new BroadcastChannel(name));
    this.channel = factory(CHANNEL_NAME);
    this.channel.onmessage = (event) => this.receive(event.data as LocalSessionEnvelope<T>);
  }

  host(projectId: string) {
    if (this.role === "host" && this.projectId && this.projectId !== projectId) this.post({ type: "host_closing", hostId: this.clientId });
    this.stopTimers();
    this.rejectPendingJoin();
    this.role = "host";
    this.projectId = projectId;
    this.hostId = this.clientId;
    this.sendHeartbeat();
    this.heartbeatTimer = setInterval(() => this.sendHeartbeat(), this.heartbeatMs);
  }

  join(projectId: string, user: Collaborator, timeoutMs = 2_500) {
    this.stopTimers();
    this.rejectPendingJoin();
    this.role = "idle";
    this.projectId = projectId;
    const requestId = crypto.randomUUID();
    return new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => {
        if (this.pendingJoin?.requestId !== requestId) return;
        clearInterval(this.pendingJoin.retryTimer);
        this.pendingJoin = undefined;
        this.role = "idle";
        this.hostId = "";
        this.stopTimers();
        resolve(false);
      }, timeoutMs);
      const request: LocalSessionMessage<T> = { type: "join_request", requestId, user };
      const retryTimer = setInterval(() => this.post(request), Math.min(250, Math.max(50, this.heartbeatMs)));
      this.pendingJoin = { requestId, resolve, timer, retryTimer };
      this.post(request);
    });
  }

  send(message: Omit<RelayMessage<T>, "senderId">) {
    if (this.role === "idle" || !this.projectId || !this.hostId) return false;
    const relay = { ...message, senderId: this.clientId } as RelayMessage<T>;
    this.post({ type: "relay", hostId: this.hostId, message: relay });
    return true;
  }

  isParticipant() {
    return this.role === "participant";
  }

  close() {
    if (this.role === "host") this.post({ type: "host_closing", hostId: this.clientId });
    if (this.role === "participant") this.post({ type: "participant_left", hostId: this.hostId });
    this.role = "idle";
    this.stopTimers();
    this.rejectPendingJoin();
    this.channel.onmessage = null;
    this.channel.close();
  }

  leaveProject() {
    if (this.role === "host") this.post({ type: "host_closing", hostId: this.clientId });
    if (this.role === "participant") this.post({ type: "participant_left", hostId: this.hostId });
    this.role = "idle";
    this.projectId = "";
    this.hostId = "";
    this.stopTimers();
    this.rejectPendingJoin();
  }

  private receive(envelope: LocalSessionEnvelope<T>) {
    if (!envelope || envelope.protocolVersion !== PROTOCOL_VERSION || envelope.senderId === this.clientId) return;
    if (envelope.projectId !== this.projectId) return;
    if (envelope.type === "join_request" && this.role === "host") {
      this.post({ type: "join_accepted", requestId: envelope.requestId, targetId: envelope.senderId, hostId: this.clientId });
      this.onMessage({ kind: "participant_joined", senderId: envelope.senderId, payload: envelope.user });
      return;
    }
    if (envelope.type === "join_request") return;
    if (envelope.type === "join_accepted") {
      if (!this.pendingJoin || envelope.targetId !== this.clientId || envelope.requestId !== this.pendingJoin.requestId) return;
      this.role = "participant";
      this.hostId = envelope.hostId;
      this.lastHeartbeat = Date.now();
      if (!this.monitorTimer) this.monitorTimer = setInterval(() => this.monitorHost(), this.heartbeatMs);
      return;
    }
    if (envelope.hostId !== this.hostId) return;
    if (envelope.type === "host_heartbeat" && this.role === "participant") {
      this.lastHeartbeat = Date.now();
    } else if (envelope.type === "relay") {
      if (this.role === "host" && envelope.senderId !== this.clientId) this.onMessage(envelope.message);
      if (this.role === "participant" && envelope.senderId === this.hostId && (!envelope.message.targetId || envelope.message.targetId === this.clientId)) {
        this.onMessage(envelope.message);
        if (envelope.message.kind === "state_snapshot") this.completeJoin();
      }
    } else if (envelope.type === "participant_left" && this.role === "host") {
      this.onMessage({ kind: "participant_left", senderId: envelope.senderId, payload: { clientId: envelope.senderId } });
    } else if (envelope.type === "host_closing" && this.role === "participant" && envelope.senderId === this.hostId) {
      this.loseHost();
    }
  }

  private monitorHost() {
    if (this.role === "participant" && Date.now() - this.lastHeartbeat > this.hostTimeoutMs) this.loseHost();
  }

  private loseHost() {
    const joined = !this.pendingJoin;
    this.role = "idle";
    this.stopTimers();
    this.rejectPendingJoin();
    if (joined) this.onHostLost();
  }

  private sendHeartbeat() {
    if (this.role === "host") this.post({ type: "host_heartbeat", hostId: this.clientId });
  }

  private post(message: LocalSessionMessage<T>) {
    this.channel.postMessage({ ...message, protocolVersion: PROTOCOL_VERSION, projectId: this.projectId, senderId: this.clientId });
  }

  private stopTimers() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.monitorTimer) clearInterval(this.monitorTimer);
    this.heartbeatTimer = undefined;
    this.monitorTimer = undefined;
  }

  private rejectPendingJoin() {
    if (!this.pendingJoin) return;
    clearTimeout(this.pendingJoin.timer);
    clearInterval(this.pendingJoin.retryTimer);
    this.pendingJoin.resolve(false);
    this.pendingJoin = undefined;
  }

  private completeJoin() {
    if (!this.pendingJoin) return;
    clearTimeout(this.pendingJoin.timer);
    clearInterval(this.pendingJoin.retryTimer);
    const resolve = this.pendingJoin.resolve;
    this.pendingJoin = undefined;
    resolve(true);
  }
}
