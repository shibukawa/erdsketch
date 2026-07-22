import assert from "node:assert/strict";
import test from "node:test";
import { waitForStablePending } from "../src/collaboration/pending.ts";

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

test("snapshot barriers wait for work appended while an earlier save is pending", async () => {
  const first = deferred();
  const second = deferred();
  let pending = first.promise;
  let finished = false;
  const waiting = waitForStablePending(() => pending).then(() => { finished = true; });

  pending = second.promise;
  first.resolve();
  await Promise.resolve();
  assert.equal(finished, false);

  second.resolve();
  await waiting;
  assert.equal(finished, true);
});
