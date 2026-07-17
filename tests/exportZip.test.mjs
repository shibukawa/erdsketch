import assert from "node:assert/strict";
import test from "node:test";

import { createArtifactZip } from "../src/export/zip.ts";

test("artifact ZIP contains stored UTF-8 paths and a valid end record", async () => {
  const blob = createArtifactZip([
    { path: "overview.md", mediaType: "text/markdown", content: "# Overview\n" },
    { path: "diagrams/日本語.svg", mediaType: "image/svg+xml", content: "<svg/>" }
  ]);
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const view = new DataView(bytes.buffer);
  const text = new TextDecoder().decode(bytes);

  assert.equal(blob.type, "application/zip");
  assert.equal(view.getUint32(0, true), 0x04034b50);
  assert.equal(view.getUint32(bytes.byteLength - 22, true), 0x06054b50);
  assert.equal(view.getUint16(bytes.byteLength - 14, true), 2);
  assert.match(text, /overview\.md/);
  assert.match(text, /diagrams\/日本語\.svg/);
});
