---
id: data:share-work-token
type: data
title: Co-work Token
---

Share work token is a compact, versioned signaling envelope carried after an invitation `#iv=` or answer `#as=` URL fragment.

```yaml
v1:
  token: type_code + length_code + payload_code
  type_code:
    width: 2_ASCII_chars
    char_1: base62_protocol_version_value_1
    char_2: base62_flag_value
    flags:
      bits_0_1: signaling_kind
      bit_2: readonly_requested
      bits_3_4: compression_code
      remaining: must_be_zero
    signaling_kind:
      0: offer
      1: answer
    compression_code:
      0: deflate_raw
  length_code:
    width: 5_ASCII_chars
    alphabet: 0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz
    encoding: zero_padded_base62_unsigned_compressed_byte_length
    numeric_range: 1_to_16777215
  payload_code:
    alphabet: 0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz
    encoding: big_endian_base62_integer
    width: ceil(compressed_byte_length * 8 / log2(62))
    padding: left_zero_pad_to_width
    leading_zero_recovery: use_length_code
  payload_before_compression:
    encoding: UTF-8
    shape:
      i: 128_bit_random_session_id_as_base62
      n: optional_invitation_label_up_to_30_Unicode_characters
      s: complete_localDescription_sdp_after_ICE_gathering
  transform:
    - encode payload as canonical compact JSON with keys in declared order
    - apply data:sdp-keyword-dictionary
    - compress with CompressionStream('deflate-raw')
    - encode compressed bytes as payload_code
limits:
  max_token_characters: 32768
  max_uncompressed_payload_bytes: 262144
validation:
  - Reject unknown version, kind, compression code, or nonzero reserved bits.
  - Require offer kind with '#iv=' and answer kind with '#as='.
  - Reject noncanonical or out-of-range length_code.
  - Read the fixed header, derive payload_code width from length_code, and parse exactly that token prefix.
  - Ignore all characters after the derived token boundary, including base62 characters captured by wiki, social, or chat URL detection.
  - Reject a token shorter than the derived boundary, invalid base62 inside the boundary, invalid UTF-8, invalid JSON, or invalid SDP.
  - Reject an answer whose session ID does not match a live pending invitation.
  - Reject control characters or more than 30 Unicode characters in an invitation label.
  - Decode under limits before calling setRemoteDescription.
```

The v1 keyword dictionary is immutable after release. Any dictionary change requires a new protocol version.
