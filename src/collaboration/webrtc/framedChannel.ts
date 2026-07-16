const chunkCharacters = 12_000;
const maximumMessageCharacters = 8_000_000;
const maximumChunks = Math.ceil(maximumMessageCharacters / chunkCharacters);
const maximumPendingMessages = 64;
const highWaterMark = 256_000;
const lowWaterMark = 64_000;

type Frame = { v: 1; i: string; n: number; c: number; d: string };
type PartialMessage = { values: Array<string | undefined>; size: number };

function waitForBuffer(channel: RTCDataChannel) {
  if (channel.bufferedAmount <= highWaterMark) return Promise.resolve();
  channel.bufferedAmountLowThreshold = lowWaterMark;
  return new Promise<void>((resolve, reject) => {
    const handleLow = () => { cleanup(); resolve(); };
    const handleClose = () => { cleanup(); reject(new Error("RTCDataChannel closed while sending.")); };
    const cleanup = () => {
      channel.removeEventListener("bufferedamountlow", handleLow);
      channel.removeEventListener("close", handleClose);
    };
    channel.addEventListener("bufferedamountlow", handleLow, { once: true });
    channel.addEventListener("close", handleClose, { once: true });
  });
}

export class FramedDataChannel<T> {
  readonly channel: RTCDataChannel;
  #parts = new Map<string, PartialMessage>();
  #sendQueue: Promise<void> = Promise.resolve();
  #onMessage: (message: T) => void;

  constructor(channel: RTCDataChannel, onMessage: (message: T) => void) {
    this.channel = channel;
    this.#onMessage = onMessage;
    channel.addEventListener("message", this.#handleMessage);
  }

  dispose() {
    this.channel.removeEventListener("message", this.#handleMessage);
    this.#parts.clear();
  }

  send(message: T) {
    const serialized = JSON.stringify(message);
    if (serialized.length > maximumMessageCharacters) return Promise.reject(new Error("Collaboration message exceeds the transport limit."));
    const task = async () => {
      if (this.channel.readyState !== "open") throw new Error("RTCDataChannel is not open.");
      const id = crypto.randomUUID();
      const count = Math.max(1, Math.ceil(serialized.length / chunkCharacters));
      for (let index = 0; index < count; index += 1) {
        await waitForBuffer(this.channel);
        const frame: Frame = { v: 1, i: id, n: index, c: count, d: serialized.slice(index * chunkCharacters, (index + 1) * chunkCharacters) };
        this.channel.send(JSON.stringify(frame));
      }
    };
    const result = this.#sendQueue.then(task, task);
    this.#sendQueue = result.catch(() => undefined);
    return result;
  }

  #handleMessage = (event: MessageEvent) => {
    if (typeof event.data !== "string" || event.data.length > chunkCharacters * 2) return;
    let frame: Frame;
    try {
      frame = JSON.parse(event.data) as Frame;
    } catch {
      return;
    }
    if (frame.v !== 1 || typeof frame.i !== "string" || frame.i.length > 64 || !Number.isInteger(frame.n) || !Number.isInteger(frame.c) || frame.n < 0 || frame.c < 1 || frame.c > maximumChunks || frame.n >= frame.c || typeof frame.d !== "string" || frame.d.length > chunkCharacters) return;
    let record = this.#parts.get(frame.i);
    if (!record) {
      if (this.#parts.size >= maximumPendingMessages) {
        const oldest = this.#parts.keys().next().value as string | undefined;
        if (oldest) this.#parts.delete(oldest);
      }
      record = { values: new Array<string | undefined>(frame.c).fill(undefined), size: 0 };
    }
    if (record.values.length !== frame.c || record.values[frame.n] !== undefined) return;
    record.values[frame.n] = frame.d;
    record.size += frame.d.length;
    if (record.size > maximumMessageCharacters) {
      this.#parts.delete(frame.i);
      return;
    }
    this.#parts.set(frame.i, record);
    if (record.values.every((value) => value !== undefined)) {
      this.#parts.delete(frame.i);
      try {
        this.#onMessage(JSON.parse(record.values.join("")) as T);
      } catch {
        // Invalid collaboration messages are ignored at the transport boundary.
      }
    }
  };
}
