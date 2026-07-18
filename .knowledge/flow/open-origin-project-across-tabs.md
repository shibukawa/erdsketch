---
id: flow:open-origin-project-across-tabs
type: flow
title: Open Origin Project Across Tabs
---

```yaml
flow:
  trigger: A tab requests writable open of an origin-private project by stable project ID.
  steps:
    - id: discover
      action: Check same-origin ownership and liveness for the requested project ID.
    - id: select_role
      action: Join the responsive owner as actor:session-participant, or atomically claim unowned authority as actor:session-host.
    - id: connect
      action: Establish the same-origin tab channel without creating a second system:persistence-worker writer for the project.
    - id: synchronize
      action: Host sends a data:collaboration-message state_snapshot before participant mutation is enabled.
    - id: edit
      action: Enter flow:host-authoritative-collaboration with host-ordered persistence and publication.
  failure:
    claim_lost: discover the winner and join it
    host_unreachable_with_live_ownership: keep writable editing disabled and offer retry or close-other-tab guidance
    snapshot_failed: disconnect and preserve the previously active local view
    authority_ambiguous: fail_closed_without_recovery_journal_access
  constraints:
    - Ownership is scoped by origin and immutable project ID, not display name.
    - A stale participant checkpoint is not proof of current host ownership.
    - Re-election requires proof that prior ownership ended; heartbeat loss alone cannot create split authority.
```
