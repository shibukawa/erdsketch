import assert from "node:assert/strict";
import test from "node:test";

import { guidedTourVersions, getGuidedTourSteps } from "../src/features/guidedTour/tours.ts";
import { guidedTourStorageKey, hasGuidedTourOutcome, saveGuidedTourOutcome } from "../src/features/guidedTour/tourProgress.ts";

function memoryStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, value); }
  };
}

test("every required surface has Japanese and English steps with stable targets", () => {
  const ids = Object.keys(guidedTourVersions);
  assert.deepEqual(ids, ["erd", "dfd", "fields", "models", "vocabulary", "vocabulary-registration"]);
  for (const id of ids) {
    const english = getGuidedTourSteps(id, "en");
    const japanese = getGuidedTourSteps(id, "ja");
    assert.ok(english.length > 0, `${id} needs steps`);
    assert.deepEqual(japanese.map((step) => step.id), english.map((step) => step.id));
    assert.deepEqual(japanese.map((step) => step.target), english.map((step) => step.target));
    assert.notEqual(japanese[0].title, english[0].title);
  }
});

test("completion and skip suppress only the same surface and version", () => {
  const storage = memoryStorage();
  assert.equal(hasGuidedTourOutcome(storage, "erd", 1), false);
  assert.equal(saveGuidedTourOutcome(storage, "erd", 1, "completed"), true);
  assert.equal(hasGuidedTourOutcome(storage, "erd", 1), true);
  assert.equal(hasGuidedTourOutcome(storage, "erd", 2), false);
  assert.equal(hasGuidedTourOutcome(storage, "dfd", 1), false);

  assert.equal(saveGuidedTourOutcome(storage, "dfd", 1, "skipped"), true);
  assert.equal(hasGuidedTourOutcome(storage, "dfd", 1), true);
});

test("invalid or unavailable browser storage never blocks a tour", () => {
  const invalid = memoryStorage();
  invalid.setItem(guidedTourStorageKey("erd", 1), "not-json");
  assert.equal(hasGuidedTourOutcome(invalid, "erd", 1), false);

  const unavailable = {
    getItem() { throw new Error("denied"); },
    setItem() { throw new Error("denied"); }
  };
  assert.equal(hasGuidedTourOutcome(unavailable, "erd", 1), false);
  assert.equal(saveGuidedTourOutcome(unavailable, "erd", 1, "completed"), false);
});
