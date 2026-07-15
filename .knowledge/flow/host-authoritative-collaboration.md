---
id: flow:host-authoritative-collaboration
type: flow
title: Host-Authoritative Collaboration
---

```yaml
flow:
  trigger: actor:session-participant joins an active session.
  steps:
    - id: synchronize
      actor: actor:session-host
      action: send a data:collaboration-message state_snapshot before accepting participant mutations
    - id: propose
      actor: actor:session-participant
      action: send an operation_intent through the selected collaboration transport
    - id: decide
      actor: actor:session-host
      action: validate identity, lock ownership, preconditions, and operation payload
    - id: serialize
      actor: actor:session-host
      action: assign the next host sequence and follow rule:continuous-project-recovery before updating canonical frontend memory
    - id: publish
      actor: actor:session-host
      action: broadcast operation_accepted or state_snapshot to every participant
    - id: reconcile
      actor: actor:session-participant
      action: replace or confirm optimistic state using host-ordered output
  failure:
    rejected_intent: keep canonical state unchanged and return operation_rejected
    recovery_write_failed: keep canonical state unchanged and pause durable mutations
    host_unavailable: pause mutations under decision:frontend-session-authority
```
