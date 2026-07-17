import type { ExportArtifact } from "./codegenWasm";

const encoder = new TextEncoder();

function crc32(bytes: Uint8Array) {
  let value = 0xffffffff;
  for (const byte of bytes) {
    value ^= byte;
    for (let bit = 0; bit < 8; bit += 1) value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0);
  }
  return (value ^ 0xffffffff) >>> 0;
}

function writeUint16(view: DataView, offset: number, value: number) {
  view.setUint16(offset, value, true);
}

function writeUint32(view: DataView, offset: number, value: number) {
  view.setUint32(offset, value, true);
}

function joinBytes(parts: Uint8Array[]) {
  const result = new Uint8Array(new ArrayBuffer(parts.reduce((size, part) => size + part.byteLength, 0)));
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.byteLength;
  }
  return result;
}

export function createArtifactZip(artifacts: ExportArtifact[]) {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let localOffset = 0;

  for (const artifact of artifacts) {
    const name = encoder.encode(artifact.path);
    const content = encoder.encode(artifact.content);
    const checksum = crc32(content);
    const local = new Uint8Array(30 + name.byteLength);
    const localView = new DataView(local.buffer);
    writeUint32(localView, 0, 0x04034b50);
    writeUint16(localView, 4, 20);
    writeUint16(localView, 6, 0x0800);
    writeUint32(localView, 14, checksum);
    writeUint32(localView, 18, content.byteLength);
    writeUint32(localView, 22, content.byteLength);
    writeUint16(localView, 26, name.byteLength);
    local.set(name, 30);
    localParts.push(local, content);

    const central = new Uint8Array(46 + name.byteLength);
    const centralView = new DataView(central.buffer);
    writeUint32(centralView, 0, 0x02014b50);
    writeUint16(centralView, 4, 20);
    writeUint16(centralView, 6, 20);
    writeUint16(centralView, 8, 0x0800);
    writeUint32(centralView, 16, checksum);
    writeUint32(centralView, 20, content.byteLength);
    writeUint32(centralView, 24, content.byteLength);
    writeUint16(centralView, 28, name.byteLength);
    writeUint32(centralView, 42, localOffset);
    central.set(name, 46);
    centralParts.push(central);
    localOffset += local.byteLength + content.byteLength;
  }

  const central = joinBytes(centralParts);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  writeUint32(endView, 0, 0x06054b50);
  writeUint16(endView, 8, artifacts.length);
  writeUint16(endView, 10, artifacts.length);
  writeUint32(endView, 12, central.byteLength);
  writeUint32(endView, 16, localOffset);
  const bytes = joinBytes([...localParts, central, end]);
  return new Blob([bytes.buffer], { type: "application/zip" });
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
