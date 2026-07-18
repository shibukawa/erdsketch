import assert from "node:assert/strict";
import test from "node:test";
import { fillMissingVocabularyName, getPrimaryVocabularyIndicator, getVocabularyIndicators, materializeVocabularyMatch } from "../src/features/modeling/vocabulary.ts";

const source = { key: "table:order", target: "table", ownerId: "order", ownerLabel: "Purchase", sourceText: "Purchase" };

test("vocabulary indicators preserve alias and both missing-name reasons", () => {
  const match = materializeVocabularyMatch(source, [{ id: "order", businessName: "Order", systemName: "", physicalName: "", meaning: "", memo: "", aliases: ["Purchase"] }]);
  assert.deepEqual(getVocabularyIndicators(match), {
    unregistered: false,
    aliasMatch: true,
    missingSystemName: true,
    missingPhysicalName: true,
    complete: false
  });
  assert.equal(match.aliasMatches[0].entryId, "order");
});

test("vocabulary indicators distinguish unregistered and complete names", () => {
  const unregistered = materializeVocabularyMatch({ ...source, sourceText: "Unknown" }, []);
  assert.equal(getVocabularyIndicators(unregistered).unregistered, true);
  const complete = materializeVocabularyMatch({ ...source, sourceText: "Order" }, [{ id: "order", businessName: "Order", systemName: "Order", physicalName: "order", meaning: "", memo: "", aliases: [] }]);
  assert.equal(getVocabularyIndicators(complete).complete, true);
});

test("primary vocabulary indicator shows only the highest-priority issue", () => {
  const aliasWithMissingNames = materializeVocabularyMatch(source, [{ id: "order", businessName: "Order", systemName: "", physicalName: "", meaning: "", memo: "", aliases: ["Purchase"] }]);
  assert.equal(getPrimaryVocabularyIndicator(aliasWithMissingNames), "missingSystemName");

  const missingPhysicalWithAlias = materializeVocabularyMatch(source, [{ id: "order", businessName: "Order", systemName: "Order", physicalName: "", meaning: "", memo: "", aliases: ["Purchase"] }]);
  assert.equal(getPrimaryVocabularyIndicator(missingPhysicalWithAlias), "missingPhysicalName");

  const aliasOnly = materializeVocabularyMatch(source, [{ id: "order", businessName: "Order", systemName: "Order", physicalName: "order", meaning: "", memo: "", aliases: ["Purchase"] }]);
  assert.equal(getPrimaryVocabularyIndicator(aliasOnly), "aliasMatch");

  const partiallyUnregistered = materializeVocabularyMatch({ ...source, sourceText: "Purchase Unknown" }, [{ id: "order", businessName: "Order", systemName: "", physicalName: "", meaning: "", memo: "", aliases: ["Purchase"] }]);
  assert.equal(getPrimaryVocabularyIndicator(partiallyUnregistered), "unregistered");
});

test("quick fill derives only missing vocabulary names from the business name", () => {
  const entry = { id: "order-item", businessName: "Order Item", systemName: "", physicalName: "", meaning: "", memo: "", aliases: [] };
  assert.equal(fillMissingVocabularyName(entry, "system").systemName, "Order Item");
  assert.equal(fillMissingVocabularyName(entry, "physical").physicalName, "order_item");

  const completed = { ...entry, systemName: "Order record", physicalName: "ord_item" };
  assert.equal(fillMissingVocabularyName(completed, "system"), completed);
  assert.equal(fillMissingVocabularyName(completed, "physical"), completed);
});
