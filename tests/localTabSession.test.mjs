import assert from "node:assert/strict";
import test from "node:test";
import { LocalTabSession } from "../src/collaboration/localTabSession.ts";
import { persistenceError } from "../src/persistence/persistenceProtocol.ts";
import { ProjectAlreadyOpenError } from "../src/persistence/persistenceErrors.ts";

class MemoryBroadcastChannel {
  static channels = new Map();

  onmessage = null;

  constructor(name) {
    this.name = name;
    const peers = MemoryBroadcastChannel.channels.get(name) ?? new Set();
    peers.add(this);
    MemoryBroadcastChannel.channels.set(name, peers);
  }

  postMessage(message) {
    for (const peer of MemoryBroadcastChannel.channels.get(this.name) ?? []) {
      if (peer === this) continue;
      const cloned = structuredClone(message);
      queueMicrotask(() => peer.onmessage?.({ data: cloned }));
    }
  }

  close() {
    MemoryBroadcastChannel.channels.get(this.name)?.delete(this);
  }
}

const user = (id) => ({ id, name: id, color: "#2563eb", x: 0, y: 0, online: true, canvasId: "main", canvasType: "erd" });
const channelFactory = (name) => new MemoryBroadcastChannel(name);
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

test("same-project tabs join one host and exchange collaboration messages", async () => {
  const hostMessages = [];
  const participantMessages = [];
  let host;
  host = new LocalTabSession("host", (message) => {
    hostMessages.push(message);
    if (message.kind === "participant_joined") host.send({ kind: "state_snapshot", targetId: message.senderId, payload: { sequence: 0 } });
  }, () => assert.fail("host cannot lose itself"), { channelFactory, heartbeatMs: 10, hostTimeoutMs: 50 });
  const participant = new LocalTabSession("participant", (message) => participantMessages.push(message), () => assert.fail("host should remain available"), { channelFactory, heartbeatMs: 10, hostTimeoutMs: 50 });
  try {
    host.host("project-a");
    assert.equal(await participant.join("project-a", user("participant"), 100), true);
    await flush();
    assert.equal(hostMessages[0].kind, "participant_joined");

    host.send({ kind: "state_snapshot", payload: { sequence: 3 } });
    participant.send({ kind: "operation_intent", messageId: "request-1", payload: { requestId: "request-1", operation: { type: "presence", patch: { x: 12 } } } });
    await flush();
    assert.equal(participantMessages.at(-1).kind, "state_snapshot");
    assert.equal(hostMessages.at(-1).kind, "operation_intent");

    participant.leaveProject();
    await flush();
    assert.equal(hostMessages.at(-1).kind, "participant_left");
  } finally {
    participant.close();
    host.close();
  }
});

test("same-browser guest sends every durable change intent to the host", async () => {
  const hostMessages = [];
  let host;
  host = new LocalTabSession("all-changes-host", (message) => {
    hostMessages.push(message);
    if (message.kind === "participant_joined") host.send({ kind: "state_snapshot", targetId: message.senderId, payload: { sequence: 0 } });
  }, () => assert.fail("host cannot lose itself"), { channelFactory, heartbeatMs: 10, hostTimeoutMs: 50 });
  const participant = new LocalTabSession("all-changes-guest", () => {}, () => assert.fail("host should remain available"), { channelFactory, heartbeatMs: 10, hostTimeoutMs: 50 });
  const operationTypes = [
    "replace_project",
    "seed",
    "placement",
    "remove_model",
    "canvas",
    "dfd",
    "ownership",
    "domain",
    "domain_category",
    "naming_policy",
    "export_settings",
    "vocabulary",
    "relationship",
    "refinement",
    "annotation"
  ];
  try {
    host.host("all-changes-project");
    assert.equal(await participant.join("all-changes-project", user("all-changes-guest"), 100), true);
    for (const [index, type] of operationTypes.entries()) {
      assert.equal(participant.send({
        kind: "operation_intent",
        messageId: `request-${index}`,
        payload: { requestId: `request-${index}`, operation: { type, verificationMarker: `change-${index}` } }
      }), true);
    }
    await flush();

    const intents = hostMessages.filter((message) => message.kind === "operation_intent");
    assert.deepEqual(intents.map((message) => message.payload.operation.type), operationTypes);
    assert.deepEqual(intents.map((message) => message.payload.operation.verificationMarker), operationTypes.map((_, index) => `change-${index}`));
  } finally {
    participant.close();
    host.close();
  }
});

test("tabs for different project IDs remain independent", async () => {
  const host = new LocalTabSession("host-b", () => {}, () => {}, { channelFactory, heartbeatMs: 10, hostTimeoutMs: 50 });
  const participant = new LocalTabSession("participant-b", () => {}, () => {}, { channelFactory, heartbeatMs: 10, hostTimeoutMs: 50 });
  try {
    host.host("project-a");
    assert.equal(await participant.join("project-b", user("participant-b"), 20), false);
  } finally {
    participant.close();
    host.close();
  }
});

test("a concurrent opener retries until the lock winner starts hosting", async () => {
  let host;
  host = new LocalTabSession("host-delayed", (message) => {
    if (message.kind === "participant_joined") host.send({ kind: "state_snapshot", targetId: message.senderId, payload: { sequence: 0 } });
  }, () => {}, { channelFactory, heartbeatMs: 10, hostTimeoutMs: 50 });
  const participant = new LocalTabSession("participant-delayed", () => {}, () => {}, { channelFactory, heartbeatMs: 10, hostTimeoutMs: 50 });
  try {
    const joined = participant.join("project-delayed", user("participant-delayed"), 200);
    await new Promise((resolve) => setTimeout(resolve, 30));
    host.host("project-delayed");
    assert.equal(await joined, true);
  } finally {
    participant.close();
    host.close();
  }
});

test("host closure makes a joined tab fail closed", async () => {
  let hostLost = false;
  let host;
  host = new LocalTabSession("host-c", (message) => {
    if (message.kind === "participant_joined") host.send({ kind: "state_snapshot", targetId: message.senderId, payload: { sequence: 0 } });
  }, () => {}, { channelFactory, heartbeatMs: 10, hostTimeoutMs: 50 });
  const participant = new LocalTabSession("participant-c", () => {}, () => { hostLost = true; }, { channelFactory, heartbeatMs: 10, hostTimeoutMs: 50 });
  try {
    host.host("project-c");
    assert.equal(await participant.join("project-c", user("participant-c"), 100), true);
    host.leaveProject();
    await flush();
    assert.equal(hostLost, true);
    assert.equal(participant.send({ kind: "operation_intent" }), false);
  } finally {
    participant.close();
    host.close();
  }
});

test("project lock contention preserves a machine-readable project ID", () => {
  assert.deepEqual(persistenceError(new ProjectAlreadyOpenError("project-42")), {
    code: "ProjectAlreadyOpen",
    retryable: true,
    message: "This project is already open for editing in another tab",
    projectId: "project-42"
  });
});
