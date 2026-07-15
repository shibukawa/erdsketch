---
id: decision:frontend-session-authority
type: decision
title: Frontend Session Authority
---

The first admitted user's frontend replaces the backend collaboration hub as the session authority.

```yaml
authority:
  owner: actor:session-host
  location: host_frontend_memory
  owns:
    - canonical data:project state
    - operation_serialization
    - edit_locks
    - conflict_resolution
    - accepted_operation_sequence
  durable_recovery: rule:continuous-project-recovery
  durable_io_boundary: decision:dedicated-persistence-worker
replicas:
  owner: actor:session-participant
  consistency: host_ordered
backend:
  system: system:collaboration-relay
  forbidden_authority:
    - canonical_project_state
    - edit_lock_state
    - operation_commit_order
failure:
  host_disconnect: pause_remote_mutation_and_fail_closed
  host_restart: flow:project-restart-recovery
  peer_behavior:
    - retain_last_received_snapshot
    - show_host_unavailable
    - do_not_elect_replacement_implicitly
open_decisions:
  - explicit_host_handoff_protocol
  - cross_device_recovery
```
