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
  assert.deepEqual(ids, ["erd", "dfd", "crud", "collaboration", "export", "fields", "models", "vocabulary", "vocabulary-registration"]);
  for (const id of ids) {
    const english = getGuidedTourSteps(id, "en");
    const japanese = getGuidedTourSteps(id, "ja");
    assert.ok(english.length > 0, `${id} needs steps`);
    assert.deepEqual(japanese.map((step) => step.id), english.map((step) => step.id));
    assert.deepEqual(japanese.map((step) => step.target), english.map((step) => step.target));
    assert.notEqual(japanese[0].title, english[0].title);
  }
});

test("expanded tours explain the core modeling concepts", () => {
  const erd = getGuidedTourSteps("erd", "en").map((step) => step.content).join(" ");
  const dfd = getGuidedTourSteps("dfd", "en").map((step) => step.content).join(" ");
  const vocabulary = getGuidedTourSteps("vocabulary", "en").map((step) => step.content).join(" ");
  const crud = getGuidedTourSteps("crud", "en").map((step) => step.content).join(" ");
  const collaboration = getGuidedTourSteps("collaboration", "en").map((step) => step.content).join(" ");
  const exportTour = getGuidedTourSteps("export", "en").map((step) => step.content).join(" ");
  assert.match(erd, /maturity/i);
  assert.match(erd, /programming-language type/i);
  assert.match(erd, /lower-right/i);
  assert.match(dfd, /lower-right/i);
  assert.match(dfd, /group/i);
  assert.match(vocabulary, /business name/i);
  assert.match(vocabulary, /abbreviation/i);
  assert.match(crud, /debugging/i);
  assert.match(crud, /DFD processes/i);
  assert.match(collaboration, /WebRTC/i);
  assert.match(collaboration, /answer URL/i);
  assert.match(collaboration, /TURN server/i);
  assert.match(collaboration, /upper-right/i);
  assert.match(exportTour, /draw\.io/i);
  assert.match(exportTour, /SQL validation/i);
});

test("canvas explanations stay centered instead of overflowing a narrow canvas", () => {
  for (const id of ["erd", "dfd"]) {
    const canvasTarget = `[data-tour='${id}-canvas']`;
    const canvasSteps = getGuidedTourSteps(id, "en").filter((step) => step.target === canvasTarget);
    assert.ok(canvasSteps.length > 0);
    assert.ok(canvasSteps.every((step) => step.placement === "center"));
  }
});

test("ERD ends at the domain dictionary and DFD starts at its visible sidebar", () => {
  const erd = getGuidedTourSteps("erd", "en");
  const dfd = getGuidedTourSteps("dfd", "en");
  assert.equal(erd.at(-1).target, "[data-tour='erd-domains']");
  assert.match(String(erd.at(-1).title), /Domains/i);
  assert.equal(dfd[0].target, "[data-tour='dfd-sidebar']");
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
