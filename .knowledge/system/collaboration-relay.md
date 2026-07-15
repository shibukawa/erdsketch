---
id: system:collaboration-relay
type: system
title: Collaboration Relay
---

Collaboration relay connects browser clients without owning modeling state or collaboration decisions.

```yaml
runtime: go_backend_mode
responsibilities:
  - admit clients to a session
  - identify the first admitted client as actor:session-host
  - route data:collaboration-message envelopes
  - expose connection and delivery failures
ephemeral_state:
  - connection_id
  - session_membership
  - routing_metadata
forbidden_state:
  - data:project
  - edit_locks
  - accepted_operation_log
  - conflict_resolution_state
future:
  data_path_replacement: system:webrtc-collaboration-transport
  possible_remaining_role: signaling
```
