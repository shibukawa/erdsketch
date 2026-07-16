---
id: permission:collaboration-session-access
type: permission
title: Collaboration Session Access
---

```yaml
modes:
  edit:
    allow:
      - receive_state_snapshot
      - receive_accepted_operations
      - send_presence
      - send_operation_intent
  readonly:
    allow:
      - receive_state_snapshot
      - receive_accepted_operations
      - send_presence
    deny:
      - send_operation_intent
authority:
  selected_by: actor:session-host
  stored_in: live_pending_invitation_and_peer_session
  enforced_by: actor:session-host
constraints:
  - The flag in data:share-work-token is presentation and negotiation metadata, not authorization authority.
  - An operation intent from a readonly peer returns operation_rejected without changing canonical state.
  - Access changes require a new host-authorized invitation in v1.
```
