---
id: flow:project-restart-recovery
type: flow
title: Project Restart Recovery
---

```yaml
flow:
  trigger: Browser opens a project with recovery data in system:origin-private-project-store.
  steps:
    - id: discover
      action: find the newest committed and valid data:project-document-set checkpoint for project_id
    - id: validate_checkpoint
      action: parse without changing live state and fall back to the previous checkpoint when invalid
    - id: replay
      action: apply contiguous valid data:project-recovery-journal records in host_sequence order
    - id: restore
      actor: actor:session-host
      action: install recovered data:project as canonical frontend memory
    - id: checkpoint
      action: write a fresh checkpoint and compact only covered journal records
    - id: publish
      action: send recovered data:collaboration-message state_snapshot after collaboration reconnects
  result:
    display:
      - recovered_revision
      - recovered_operation_count
      - ignored_tail_count
  failure:
    no_valid_checkpoint: offer data:portable-project-archive import or initial seed start
    quota_or_permission_error: keep recovery files unchanged and report the error
```
