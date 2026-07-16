import assert from "node:assert/strict";
import test from "node:test";
import { FramedDataChannel } from "../src/collaboration/webrtc/framedChannel.ts";

class FakeDataChannel extends EventTarget {
  readyState = "open";
  bufferedAmount = 0;
  bufferedAmountLowThreshold = 0;
  partner;

  send(value) {
    this.partner.dispatchEvent(new MessageEvent("message", { data: value }));
  }
}

test("framed data channel reassembles multi-frame collaboration messages", async () => {
  const left = new FakeDataChannel();
  const right = new FakeDataChannel();
  left.partner = right;
  right.partner = left;
  const received = [];
  const receiver = new FramedDataChannel(right, (message) => received.push(message));
  const sender = new FramedDataChannel(left, () => undefined);
  const message = { kind: "state_snapshot", payload: { text: "共有".repeat(20_000) } };
  await sender.send(message);
  assert.deepEqual(received, [message]);
  sender.dispose();
  receiver.dispose();
});

test("framed data channel ignores incomplete frame sets", () => {
  const channel = new FakeDataChannel();
  channel.partner = channel;
  const received = [];
  const receiver = new FramedDataChannel(channel, (message) => received.push(message));
  channel.dispatchEvent(new MessageEvent("message", { data: JSON.stringify({ v: 1, i: "partial", n: 0, c: 2, d: "{\"a\":" }) }));
  channel.dispatchEvent(new MessageEvent("message", { data: JSON.stringify({ v: 1, i: "oversized", n: 0, c: 1_000_000, d: "{}" }) }));
  assert.deepEqual(received, []);
  receiver.dispose();
});
