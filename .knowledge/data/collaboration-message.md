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
  - control
constraints:
  - Operation order is defined by host sequence, not transport arrival order at replicas.
  - Duplicate message_id handling is idempotent.
  - Payload semantics are identical through system:collaboration-relay and system:webrtc-collaboration-transport.
  - File system handles, native paths, and browser objects never enter the protocol.
```
