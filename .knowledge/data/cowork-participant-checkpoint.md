---
id: data:cowork-participant-checkpoint
type: data
title: Co-work Participant Checkpoint
---

Checkpoint preserves the last host-accepted participant view for session-loss recovery; it is not a reconnect credential or shared authority.

```yaml
fields:
  tab_session_id: random_per_tab
  cowork_session_id: opaque
  invitation_label: optional
  access: edit_or_readonly
  host_snapshot: last_accepted_data_project_state
  host_sequence: last_accepted_sequence
  updated_at: unix_milliseconds
storage:
  marker: sessionStorage
  snapshot: sessionStorage_scoped_to_tab_session
lifecycle:
  write: after_each_accepted_state_snapshot
  clear:
    - user_closes_recovery
    - explicit_session_cleanup
constraints:
  - Never store SDP, TURN credentials, or a reusable answer.
  - Never replay unsent or unaccepted participant intents.
  - Private browsing may remove the checkpoint when the private browsing session closes.
  - A valid snapshot may be viewed only in read-only reference mode and never promoted to an editable project.
  - Missing or corrupt snapshot permits close only.
```
