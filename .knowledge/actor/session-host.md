---
id: actor:session-host
type: actor
title: Collaboration Session Host
---

Session host is the first participant admitted to a collaboration session and the only frontend authority for that session.

```yaml
assignment:
  rule: first_admitted_participant
  cardinality_per_session: one
  scope: session_only
responsibilities:
  - hold canonical volatile data:project state
  - serialize data:collaboration-message operation intents
  - own edit locks and conflict decisions
  - publish accepted operations and snapshots
  - perform flow:project-load-save
  - create peer invitations and enforce permission:collaboration-session-access
constraints:
  - Host status is not an account-wide privilege.
  - Other participants never commit project mutations directly.
  - Loss of the host must not create a second authority implicitly.
```
