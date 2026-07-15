import type { DurableOperation, DurableState } from "../collaboration/types";
import { appendText, getProjectDirectory, readText, storageManager, writeText } from "./opfs";

const FORMAT_VERSION = 1;
const CHECKPOINT_INTERVAL = 25;

type RecoveryRecord<T> = {
  formatVersion: 1;
  projectId: string;
  hostSequence: number;
  messageId: string;
  operation: DurableOperation<T>;
  previousChecksum: string;
  checksum: string;
};

type Checkpoint<T> = {
  formatVersion: 1;
  projectId: string;
  hostSequence: number;
  checksum: string;
  state: DurableState<T>;
  messageIds?: string[];
};

type CheckpointMarker = {
  formatVersion: 1;
  file: string;
};

export type RecoveryResult<T> = {
  state: DurableState<T>;
  sequence: number;
  recoveredOperations: number;
  ignoredTailRecords: number;
  persistentStorage: boolean;
};

async function digest(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function recordChecksum<T>(record: Omit<RecoveryRecord<T>, "checksum">) {
  return digest(JSON.stringify(record));
}

export class RecoveryStore<T> {
  private sequence = 0;
  private checksum = "";
  private recordsSinceCheckpoint = 0;
  private readonly messageIds = new Set<string>();

  private constructor(private readonly projectId: string, private readonly directory: FileSystemDirectoryHandle, private readonly persistentStorage: boolean) {}

  static async open<T>(projectId: string) {
    const manager = storageManager();
    const persistentStorage = manager.persist ? await manager.persist().catch(() => false) : false;
    return new RecoveryStore<T>(projectId, await getProjectDirectory(projectId), persistentStorage);
  }

  async recover(initialState: DurableState<T>, replay: (state: DurableState<T>, operation: DurableOperation<T>) => DurableState<T>): Promise<RecoveryResult<T>> {
    let state = structuredClone(initialState);
    const markerText = await readText(this.directory, "current.json");
    const previousMarkerText = await readText(this.directory, "previous.json");
    let checkpointLoaded = false;
    for (const candidate of [markerText, previousMarkerText]) {
      if (!candidate || checkpointLoaded) continue;
      try {
        const marker = JSON.parse(candidate) as CheckpointMarker;
        const checkpointText = marker.formatVersion === FORMAT_VERSION ? await readText(this.directory, marker.file) : undefined;
        if (checkpointText) {
          const checkpoint = JSON.parse(checkpointText) as Checkpoint<T>;
          if (checkpoint.formatVersion === FORMAT_VERSION && checkpoint.projectId === this.projectId) {
            state = checkpoint.state;
            this.sequence = checkpoint.hostSequence;
            this.checksum = checkpoint.checksum;
            for (const messageId of checkpoint.messageIds ?? []) this.messageIds.add(messageId);
            checkpointLoaded = true;
          }
        }
      } catch {
        // Try the previous checkpoint when the current marker or checkpoint is torn.
      }
    }

    const journalText = await readText(this.directory, "journal.jsonl");
    let recoveredOperations = 0;
    let ignoredTailRecords = 0;
    if (journalText) {
      const lines = journalText.split("\n").filter(Boolean);
      for (let index = 0; index < lines.length; index += 1) {
        try {
          const record = JSON.parse(lines[index]) as RecoveryRecord<T>;
          const { checksum, ...unsigned } = record;
          const valid = record.formatVersion === FORMAT_VERSION
            && record.projectId === this.projectId
            && record.hostSequence === this.sequence + 1
            && record.previousChecksum === this.checksum
            && checksum === await recordChecksum(unsigned);
          if (!valid) throw new Error("invalid recovery record");
          state = replay(state, record.operation);
          this.sequence = record.hostSequence;
          this.checksum = checksum;
          this.messageIds.add(record.messageId);
          recoveredOperations += 1;
        } catch {
          ignoredTailRecords = lines.length - index;
          break;
        }
      }
    }
    this.recordsSinceCheckpoint = recoveredOperations;
    if (!checkpointLoaded && recoveredOperations === 0) await this.checkpoint(state);
    return { state, sequence: this.sequence, recoveredOperations, ignoredTailRecords, persistentStorage: this.persistentStorage };
  }

  hasMessage(messageId: string) {
    return this.messageIds.has(messageId);
  }

  currentSequence() {
    return this.sequence;
  }

  async append(operation: DurableOperation<T>, messageId: string, expectedPreviousSequence = this.sequence) {
    if (expectedPreviousSequence !== this.sequence) throw new Error(`Durable sequence mismatch: expected ${expectedPreviousSequence}, found ${this.sequence}`);
    const unsigned: Omit<RecoveryRecord<T>, "checksum"> = {
      formatVersion: FORMAT_VERSION,
      projectId: this.projectId,
      hostSequence: this.sequence + 1,
      messageId,
      operation,
      previousChecksum: this.checksum
    };
    const record: RecoveryRecord<T> = { ...unsigned, checksum: await recordChecksum(unsigned) };
    await appendText(this.directory, "journal.jsonl", `${JSON.stringify(record)}\n`);
    this.sequence = record.hostSequence;
    this.checksum = record.checksum;
    this.messageIds.add(messageId);
    this.recordsSinceCheckpoint += 1;
    return this.sequence;
  }

  shouldCheckpoint() {
    return this.recordsSinceCheckpoint >= CHECKPOINT_INTERVAL;
  }

  async checkpoint(state: DurableState<T>) {
    const file = `checkpoint-${this.sequence}.json`;
    const checkpoint: Checkpoint<T> = {
      formatVersion: FORMAT_VERSION,
      projectId: this.projectId,
      hostSequence: this.sequence,
      checksum: this.checksum,
      state: structuredClone(state),
      messageIds: [...this.messageIds].slice(-256)
    };
    const currentMarker = await readText(this.directory, "current.json");
    await writeText(this.directory, file, JSON.stringify(checkpoint));
    if (currentMarker) await writeText(this.directory, "previous.json", currentMarker);
    await writeText(this.directory, "current.json", JSON.stringify({ formatVersion: FORMAT_VERSION, file } satisfies CheckpointMarker));
    await writeText(this.directory, "journal.jsonl", "");
    this.recordsSinceCheckpoint = 0;
  }

  async quota() {
    return navigator.storage.estimate();
  }
}
