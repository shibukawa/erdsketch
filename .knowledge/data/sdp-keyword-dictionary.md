---
id: data:sdp-keyword-dictionary
type: data
title: SDP Keyword Dictionary
---

V1 replaces frequent ASCII sequences in canonical compact JSON bytes before deflate compression.

```yaml
v1:
  match: greedy_longest_then_lowest_token
  replacements:
    '01': '\r\na='
    '02': '\r\nm='
    '03': '\r\nc='
    '04': 'UDP/DTLS/SCTP webrtc-datachannel'
    '05': 'a=fingerprint:sha-256 '
    '06': 'a=ice-ufrag:'
    '07': 'a=ice-pwd:'
    '08': 'a=setup:actpass'
    '09': 'a=sctp-port:5000'
    '0a': 'candidate:'
    '0b': ' typ host'
    '0c': ' typ srflx'
    '0d': ' typ relay'
    '0e': ' IN IP4 '
    '0f': ' IN IP6 '
    '10': '\r\n'
constraints:
  - Token names are hexadecimal byte values 0x01 through 0x10.
  - Valid compact JSON UTF-8 contains no raw bytes 0x00 through 0x1F; encountering one before replacement is an encoding error.
  - Decoding replaces token bytes with their exact ASCII sequences before UTF-8 and JSON parsing.
  - Replacement entries and matching order never change within protocol version 1.
```
