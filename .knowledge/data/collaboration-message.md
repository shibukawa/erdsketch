---
id: data:collaboration-message
type: data
title: Collaboration Message
---

Collaboration message is the transport-independent protocol envelope exchanged between actor:session-host and actor:session-participant.

```yaml
envelope:
  required:
    - protocol_version
    - session_id
    - sender_id
    - message_id
    - kind
    - payload
  host_outputs:
    sequence: monotonically_increasing_per_session
kinds:
  - join
  - operation_intent
  - operation_accepted
  - operation_rejected
  - state_snapshot
  - presence
  - session_closing
  - transport_ping
  - transport_pong
session_closing:
  sender: actor:session-host
  payload:
    message: optional_human_text_up_to_120_Unicode_characters
  handling: display_reason_then_close_transport
heartbeat:
  request: transport_ping
  response: transport_pong
  participant_interval_ms: 5000
  visible_timeout_ms: 15000
  resume_rule: reset_timeout_then_probe_when_document_becomes_visible
presence:
  text_edit_targets:
    annotation: editing_annotation_id
    model: editing_model_id
  persistence: transient
constraints:
  - Operation order is defined by host sequence, not transport arrival order at replicas.
  - Duplicate message_id handling is idempotent.
  - Payload semantics are identical through system:collaboration-relay and system:webrtc-collaboration-transport.
  - File system handles, native paths, and browser objects never enter the protocol.
```
