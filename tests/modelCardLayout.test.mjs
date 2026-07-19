import assert from "node:assert/strict";
import test from "node:test";
import { getDomainPhysicalTypeLabel, getModelCardWidth, getModelDescriptionCardHeight, getRelationshipGeometry } from "../src/features/modeling/utils.ts";

test("model cards keep the compact baseline and grow for long one-line names", () => {
  assert.equal(getModelCardWidth("Coupon"), 300);
  assert.ok(getModelCardWidth("顧客別月次請求明細長期保存モデル") > 300);
  assert.ok(getModelCardWidth("A very long descriptive business model name") > 300);
  assert.ok(getModelCardWidth("LongLongLongLongLongModelName") <= 440);
  assert.ok(getModelCardWidth("Short", ["A very long tag that must remain on one line", "Second tag"]) > 300);
});

test("relationship endpoints use each rendered card width", () => {
  const seeds = [
    { id: "wide", x: 0, y: 0 },
    { id: "target", x: 700, y: 0 }
  ];
  const relationship = {
    id: "link", sourceId: "wide", targetId: "target", direction: "source-to-target",
    sourceMultiplicity: "1", targetMultiplicity: "1", name: "link"
  };
  const geometry = getRelationshipGeometry(relationship, seeds, { wide: 480, target: 300 });
  assert.equal(geometry?.sourcePoint.x, 480);
  assert.match(geometry?.path ?? "", /^M480 97 C/);
});

test("description cards grow until wrapped text fits without scrolling", () => {
  assert.equal(getModelDescriptionCardHeight("Short description", 300), 194);
  const height = getModelDescriptionCardHeight("A rough model idea. Drag it near related seeds and rename it when it gets clearer.", 300);
  assert.ok(height > 194);

  const seeds = [
    { id: "tall", x: 0, y: 0 },
    { id: "below", x: 0, y: 500 }
  ];
  const relationship = {
    id: "vertical", sourceId: "tall", targetId: "below", direction: "source-to-target",
    sourceMultiplicity: "1", targetMultiplicity: "1", name: "vertical"
  };
  const geometry = getRelationshipGeometry(relationship, seeds, { tall: 300, below: 300 }, { tall: height, below: 194 });
  assert.equal(geometry?.sourcePoint.y, height);
});

test("physical key summaries resolve scalar domains to their primitive type", () => {
  const domains = [
    { id: "varchar", shape: "primitive", primitiveType: "varchar", length: 24, components: [] },
    { id: "status", shape: "scalar", components: [{ id: "value", domainId: "varchar", required: true }] }
  ];
  assert.equal(getDomainPhysicalTypeLabel("status", domains), "VARCHAR(24)");
  assert.equal(getDomainPhysicalTypeLabel("missing", domains), undefined);
});
