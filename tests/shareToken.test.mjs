import assert from "node:assert/strict";
import test from "node:test";
import {
  decodeBase62Bytes,
  decodeShareToken,
  encodeBase62Bytes,
  encodeShareToken,
  extractShareTokenPrefix,
  parseInitialShareSignal,
  shareTokenPayloadWidth
} from "../src/collaboration/webrtc/shareToken.ts";

test("base62 byte conversion preserves leading zero bytes through the declared length", () => {
  const source = new Uint8Array([0, 0, 1, 2, 3, 254, 255]);
  const encoded = encodeBase62Bytes(source);
  assert.match(encoded, /^[0-9A-Za-z]+$/);
  assert.deepEqual(decodeBase62Bytes(encoded, source.byteLength), source);
});

test("invitation and answer tokens round-trip SDP and access metadata", async () => {
  const sdp = "v=0\r\no=- 123 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\na=ice-ufrag:abc\r\na=ice-pwd:def\r\na=fingerprint:sha-256 00:11\r\nm=application 9 UDP/DTLS/SCTP webrtc-datachannel\r\na=sctp-port:5000\r\n";
  const invitation = await encodeShareToken({ kind: "invitation", readonly: true, sessionId: "01AbZ", sdp });
  assert.match(invitation, /^[0-9A-Za-z]+$/);
  assert.equal(invitation.slice(2, 7).length, 5);
  assert.equal(invitation.length, 7 + shareTokenPayloadWidth(decodeBase62Integer(invitation.slice(2, 7))));
  assert.deepEqual(await decodeShareToken(invitation, "invitation"), { kind: "invitation", readonly: true, sessionId: "01AbZ", sdp });

  const answer = await encodeShareToken({ kind: "answer", readonly: false, sessionId: "01AbZ", sdp });
  assert.deepEqual(await decodeShareToken(answer, "answer"), { kind: "answer", readonly: false, sessionId: "01AbZ", sdp });
  await assert.rejects(() => decodeShareToken(answer, "invitation"), /Expected an invitation/);
});

test("decoder rejects symbols and invalid length declarations", async () => {
  await assert.rejects(() => decodeShareToken("10abc-", "invitation"), /base62|length/i);
  await assert.rejects(() => decodeShareToken("1000001", "invitation"), /stream|payload|invalid/i);
});

test("declared payload length isolates tokens from wiki and social URL suffixes", async () => {
  const sdp = "v=0\r\no=- 456 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\na=ice-ufrag:xyz\r\n";
  const token = await encodeShareToken({ kind: "invitation", readonly: false, sessionId: "AbC123", sdp });
  const expected = { kind: "invitation", readonly: false, sessionId: "AbC123", sdp };

  for (const suffix of ["WikiFootnote123", ")余計な説明", "%EF%BC%89SNStext"]) {
    assert.equal(extractShareTokenPrefix(token + suffix), token);
    assert.deepEqual(await decodeShareToken(token + suffix, "invitation"), expected);
  }

  const parsed = parseInitialShareSignal(`https://example.test/model#iv=${token}WikiFootnote123`);
  assert.deepEqual(parsed, {
    kind: "invitation",
    token,
    url: `https://example.test/model#iv=${token}WikiFootnote123`
  });

  const answer = await encodeShareToken({ kind: "answer", readonly: false, sessionId: "AbC123", sdp });
  assert.equal(parseInitialShareSignal(`https://example.test/model#as=${answer}ChatSuffix`)?.token, answer);
  assert.deepEqual(await decodeShareToken(answer + "ChatSuffix", "answer"), { ...expected, kind: "answer" });
});

test("decoder rejects a token cut before its declared payload boundary", async () => {
  const token = await encodeShareToken({ kind: "answer", readonly: false, sessionId: "AbC123", sdp: "v=0\r\ns=-\r\n" });
  await assert.rejects(() => decodeShareToken(token.slice(0, -1), "answer"), /truncated|boundary/i);
});

test("invitation token carries an optional 30-character label", async () => {
  const sdp = "v=0\r\ns=-\r\n";
  const label = "顧客管理モデル / Alice";
  const token = await encodeShareToken({ kind: "invitation", readonly: false, sessionId: "Label01", label, sdp });
  assert.deepEqual(await decodeShareToken(token, "invitation"), { kind: "invitation", readonly: false, sessionId: "Label01", label, sdp });
  await assert.rejects(() => encodeShareToken({ kind: "invitation", readonly: false, sessionId: "Label02", label: "a".repeat(31), sdp }), /30 characters/i);
});

function decodeBase62Integer(value) {
  const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  return [...value].reduce((result, character) => result * 62 + alphabet.indexOf(character), 0);
}
