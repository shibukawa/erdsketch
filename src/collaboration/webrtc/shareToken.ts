const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const alphabetIndex = new Map([...alphabet].map((character, index) => [character, index]));
const tokenVersion = 1;
const typeWidth = 2;
const lengthWidth = 5;
const maximumCompressedBytes = 0xffffff;
const maximumTokenCharacters = 32_768;
const maximumUncompressedBytes = 262_144;

export type ShareSignalKind = "invitation" | "answer";

export type ShareToken = {
  kind: ShareSignalKind;
  readonly: boolean;
  sessionId: string;
  label?: string;
  sdp: string;
};

export type InitialShareSignal = {
  kind: ShareSignalKind;
  token: string;
  url: string;
};

const dictionaryEntries = [
  [0x04, "UDP/DTLS/SCTP webrtc-datachannel"],
  [0x05, "a=fingerprint:sha-256 "],
  [0x06, "a=ice-ufrag:"],
  [0x07, "a=ice-pwd:"],
  [0x08, "a=setup:actpass"],
  [0x09, "a=sctp-port:5000"],
  [0x0a, "candidate:"],
  [0x0b, " typ host"],
  [0x0c, " typ srflx"],
  [0x0d, " typ relay"],
  [0x0e, " IN IP4 "],
  [0x0f, " IN IP6 "],
  [0x01, "\\r\\na="],
  [0x02, "\\r\\nm="],
  [0x03, "\\r\\nc="],
  [0x10, "\\r\\n"]
] as const;

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });
const encodedDictionary = dictionaryEntries
  .map(([token, value]) => ({ token, bytes: encoder.encode(value) }))
  .sort((left, right) => right.bytes.length - left.bytes.length || left.token - right.token);
const decodedDictionary = new Map<number, Uint8Array>(dictionaryEntries.map(([token, value]) => [token, encoder.encode(value)]));

function encodeInteger(value: number, width: number) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error("Cannot encode a negative or non-integer value.");
  let remaining = value;
  let result = "";
  do {
    result = alphabet[remaining % 62] + result;
    remaining = Math.floor(remaining / 62);
  } while (remaining > 0);
  if (result.length > width) throw new Error("Value is too large for the share token field.");
  return result.padStart(width, "0");
}

function decodeInteger(value: string) {
  let result = 0;
  for (const character of value) {
    const digit = alphabetIndex.get(character);
    if (digit === undefined) throw new Error("Share token contains a non-base62 character.");
    result = result * 62 + digit;
    if (!Number.isSafeInteger(result)) throw new Error("Share token integer is too large.");
  }
  return result;
}

export function shareTokenPayloadWidth(compressedByteLength: number) {
  if (!Number.isSafeInteger(compressedByteLength) || compressedByteLength < 0) throw new Error("Share token length field is invalid.");
  return compressedByteLength === 0 ? 0 : Math.ceil((compressedByteLength * 8) / Math.log2(62));
}

export function extractShareTokenPrefix(source: string) {
  const headerWidth = typeWidth + lengthWidth;
  if (source.length < headerWidth) throw new Error("Share token is truncated before its length field.");
  const header = source.slice(0, headerWidth);
  if ([...header].some((character) => !alphabetIndex.has(character))) throw new Error("Share token header must contain base62 characters only.");
  const lengthCode = header.slice(typeWidth);
  const compressedLength = decodeInteger(lengthCode);
  if (compressedLength <= 0 || compressedLength > maximumCompressedBytes || encodeInteger(compressedLength, lengthWidth) !== lengthCode) {
    throw new Error("Share token length field is invalid.");
  }
  const tokenLength = headerWidth + shareTokenPayloadWidth(compressedLength);
  if (tokenLength > maximumTokenCharacters) throw new Error("Share token length is invalid.");
  if (source.length < tokenLength) throw new Error("Share token is truncated before its declared payload boundary.");
  const token = source.slice(0, tokenLength);
  if ([...token].some((character) => !alphabetIndex.has(character))) throw new Error("Share token must contain base62 characters only.");
  return token;
}

export function encodeBase62Bytes(source: Uint8Array) {
  const digits = [0];
  for (const byte of source) {
    let carry = byte;
    for (let index = 0; index < digits.length; index += 1) {
      const value = digits[index] * 256 + carry;
      digits[index] = value % 62;
      carry = Math.floor(value / 62);
    }
    while (carry > 0) {
      digits.push(carry % 62);
      carry = Math.floor(carry / 62);
    }
  }
  return digits.reverse().map((digit) => alphabet[digit]).join("");
}

export function decodeBase62Bytes(source: string, expectedLength: number) {
  if (!source) throw new Error("Share token payload is empty.");
  const bytes = [0];
  for (const character of source) {
    const digit = alphabetIndex.get(character);
    if (digit === undefined) throw new Error("Share token contains a non-base62 character.");
    let carry = digit;
    for (let index = 0; index < bytes.length; index += 1) {
      const value = bytes[index] * 62 + carry;
      bytes[index] = value & 0xff;
      carry = value >>> 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>>= 8;
    }
  }
  if (bytes.length > expectedLength) throw new Error("Share token payload exceeds its declared length.");
  const result = new Uint8Array(expectedLength);
  const decoded = bytes.reverse();
  result.set(decoded, expectedLength - decoded.length);
  return result;
}

function startsWithAt(source: Uint8Array, candidate: Uint8Array, offset: number) {
  if (offset + candidate.length > source.length) return false;
  for (let index = 0; index < candidate.length; index += 1) if (source[offset + index] !== candidate[index]) return false;
  return true;
}

function replaceKeywords(source: Uint8Array) {
  if (source.some((byte) => byte <= 0x1f)) throw new Error("Canonical signaling JSON contains a reserved byte.");
  const output: number[] = [];
  for (let offset = 0; offset < source.length;) {
    const entry = encodedDictionary.find((candidate) => startsWithAt(source, candidate.bytes, offset));
    if (entry) {
      output.push(entry.token);
      offset += entry.bytes.length;
    } else {
      output.push(source[offset]);
      offset += 1;
    }
  }
  return new Uint8Array(output);
}

function restoreKeywords(source: Uint8Array) {
  const output: number[] = [];
  for (const byte of source) {
    const replacement = decodedDictionary.get(byte);
    if (replacement) output.push(...replacement);
    else output.push(byte);
    if (output.length > maximumUncompressedBytes) throw new Error("Expanded share token exceeds the size limit.");
  }
  return new Uint8Array(output);
}

async function transformStream(source: Uint8Array, stream: CompressionStream | DecompressionStream, maximumBytes: number) {
  const input = new ArrayBuffer(source.byteLength);
  new Uint8Array(input).set(source);
  const writer = stream.writable.getWriter();
  const writing = writer.write(input).then(() => writer.close());
  const reader = stream.readable.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maximumBytes) {
      await reader.cancel();
      throw new Error("Share token stream exceeds the size limit.");
    }
    chunks.push(value);
  }
  await writing;
  const output = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return output;
}

async function compress(source: Uint8Array) {
  return transformStream(source, new CompressionStream("deflate-raw"), maximumCompressedBytes);
}

async function decompress(source: Uint8Array) {
  return transformStream(source, new DecompressionStream("deflate-raw"), maximumUncompressedBytes);
}

export function createSessionId() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return encodeBase62Bytes(bytes);
}

export async function encodeShareToken(value: ShareToken) {
  const kindValue = value.kind === "answer" ? 1 : 0;
  const flags = kindValue | (value.readonly ? 1 << 2 : 0);
  const typeCode = alphabet[tokenVersion] + alphabet[flags];
  const label = value.label?.trim();
  if (label && ([...label].length > 30 || /[\u0000-\u001f\u007f]/.test(label))) throw new Error("Invitation label must be 30 characters or fewer and contain no control characters.");
  const canonical = encoder.encode(JSON.stringify(label ? { i: value.sessionId, n: label, s: value.sdp } : { i: value.sessionId, s: value.sdp }));
  if (canonical.byteLength > maximumUncompressedBytes) throw new Error("Session description is too large to share in a URL.");
  const compressed = await compress(replaceKeywords(canonical));
  const payload = encodeBase62Bytes(compressed).padStart(shareTokenPayloadWidth(compressed.byteLength), "0");
  const token = typeCode + encodeInteger(compressed.byteLength, lengthWidth) + payload;
  if (token.length > maximumTokenCharacters) throw new Error("Session description is too large to share in a URL.");
  return token;
}

export async function decodeShareToken(source: string, expectedKind?: ShareSignalKind): Promise<ShareToken> {
  const token = extractShareTokenPrefix(source);
  const version = decodeInteger(token.slice(0, 1));
  if (version !== tokenVersion) throw new Error("This share token version is not supported.");
  const flags = decodeInteger(token.slice(1, 2));
  if ((flags & ~0b1_1111) !== 0 || ((flags >>> 3) & 0b11) !== 0) throw new Error("Share token flags are not supported.");
  const kindBits = flags & 0b11;
  if (kindBits > 1) throw new Error("Share token signaling kind is invalid.");
  const kind: ShareSignalKind = kindBits === 0 ? "invitation" : "answer";
  if (expectedKind && kind !== expectedKind) throw new Error(`Expected an ${expectedKind} share token.`);
  const lengthCode = token.slice(typeWidth, typeWidth + lengthWidth);
  const compressedLength = decodeInteger(lengthCode);
  if (compressedLength > maximumCompressedBytes || encodeInteger(compressedLength, lengthWidth) !== lengthCode) throw new Error("Share token length field is invalid.");
  const compressed = decodeBase62Bytes(token.slice(typeWidth + lengthWidth), compressedLength);
  const canonical = restoreKeywords(await decompress(compressed));
  const parsed = JSON.parse(decoder.decode(canonical)) as { i?: unknown; n?: unknown; s?: unknown };
  if (typeof parsed.i !== "string" || !parsed.i || [...parsed.i].some((character) => !alphabetIndex.has(character))) throw new Error("Share token session ID is invalid.");
  if (parsed.n !== undefined && (typeof parsed.n !== "string" || !parsed.n || [...parsed.n].length > 30 || /[\u0000-\u001f\u007f]/.test(parsed.n))) throw new Error("Share token invitation label is invalid.");
  if (typeof parsed.s !== "string" || !parsed.s.startsWith("v=0")) throw new Error("Share token SDP is invalid.");
  return { kind, readonly: (flags & (1 << 2)) !== 0, sessionId: parsed.i, ...(parsed.n ? { label: parsed.n as string } : {}), sdp: parsed.s };
}

export function parseInitialShareSignal(locationHref = window.location.href): InitialShareSignal | undefined {
  const url = new URL(locationHref);
  const match = url.hash.match(/^#(iv|as)=(.*)$/s);
  if (!match) return undefined;
  let token = match[2];
  try {
    token = extractShareTokenPrefix(token);
  } catch {
    // Preserve malformed input so the join or relay UI can report its validation error.
  }
  return { kind: match[1] === "iv" ? "invitation" : "answer", token, url: url.href };
}

export function clearShareFragment() {
  const url = new URL(window.location.href);
  if (!/^#(?:iv|as)=/.test(url.hash)) return;
  url.hash = "";
  window.history.replaceState(window.history.state, "", url);
}

export function createShareUrl(kind: ShareSignalKind, token: string) {
  const url = new URL(window.location.href);
  url.hash = `${kind === "invitation" ? "iv" : "as"}=${token}`;
  return url.href;
}

export function answerMailboxKey(sessionId: string) {
  return `erdsketch.share-work.answer.v1.${sessionId}`;
}

export const answerMailboxPrefix = "erdsketch.share-work.answer.v1.";

export function cleanupExpiredAnswerMailboxes(now = Date.now()) {
  for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
    const key = window.localStorage.key(index);
    if (!key?.startsWith(answerMailboxPrefix)) continue;
    try {
      const value = JSON.parse(window.localStorage.getItem(key) ?? "null") as { c?: unknown } | null;
      if (!value || typeof value.c !== "number" || now - value.c > 10 * 60 * 1000) window.localStorage.removeItem(key);
    } catch {
      window.localStorage.removeItem(key);
    }
  }
}
