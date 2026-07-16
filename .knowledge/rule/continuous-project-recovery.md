---
id: rule:continuous-project-recovery
type: rule
title: Continuous Project Recovery
---

Every accepted durable mutation survives runtime restart within the same storage scope before it is acknowledged or published.

```yaml
commit_protocol:
  authority: actor:session-host
  steps:
    - validate operation and derive candidate data:project state
    - send append_and_flush with the expected previous host sequence to system:persistence-worker
    - receive a successful data:persistence-worker-message with the new durable sequence
    - apply the candidate to canonical host frontend memory
    - publish data:collaboration-message operation_accepted
    - acknowledge the initiating user
failure:
  worker_or_storage_write:
    canonical_state_change: none
    operation_acknowledged: false
    action: pause_durable_mutations_and_show_recovery_storage_error
checkpoints:
  content: data:project-document-set
  create:
    - after configurable accepted-operation count
    - after configurable elapsed time with changes
    - before explicit save or export
    - during clean shutdown when available
  commit: write_new_checkpoint_then_commit_marker
  cleanup: only_after_checkpoint_validation
storage_policy:
  browser:
    request_persistence: navigator.storage.persist
    monitor_quota: navigator.storage.estimate
  wails_desktop:
    storage: system:origin-private-project-store
    scope: application_webview_origin
  persistence_denied: warn_and_continue_with_export_recommendation
limits:
  recovery_boundary:
    browser: same_device_and_same_origin
    wails_desktop: same_device_and_same_application_webview_origin
  not_a_backup_against:
    - site_data_deletion
    - device_loss
    - origin_change
```
