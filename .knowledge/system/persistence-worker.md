---
id: system:persistence-worker
type: system
title: Persistence Worker
---

Persistence worker is the dedicated browser worker that owns durable project I/O for one host tab.

```yaml
runtime:
  kind: DedicatedWorker
  owner: actor:session-host
  startup:
    - open system:origin-private-project-store
    - load and validate the project catalog
    - acquire a project-scoped cross-tab write lock before writable open
    - recover the selected project and report ready with its durable sequence
interface: data:persistence-worker-message
operations:
  project:
    - list
    - create_named
    - create_temporary
    - open
    - rename
    - delete
  recovery:
    - append_and_flush
    - create_checkpoint
    - replay
  interchange:
    - import_data:portable-project-archive
    - export_data:portable-project-archive
    - read_or_write_user_selected_file_handle
ordering:
  semantic_order_owner: actor:session-host
  durable_queue: serial_per_project
  append_precondition: expected_previous_host_sequence_matches_durable_sequence
  acknowledgement: only_after_record_is_flushed
storage_access:
  preferred: FileSystemSyncAccessHandle_in_dedicated_worker
  fallback: asynchronous_OPFS_file_streams_in_dedicated_worker
large_payloads:
  representation: ArrayBuffer
  transfer: ownership_transfer_without_copy_when_available
external_file_access:
  picker_owner: Window
  worker_input: selected_handle_or_transferable_bytes
  permission_error: return_typed_error_to_UI
cross_tab:
  lock_scope: origin_and_project_id
  conflict: reject_writable_open_or_offer_read_only_mode
failure:
  request_error: typed_error_response_without_host_state_commit
  worker_crash:
    - pause durable mutations
    - create a replacement worker
    - reopen and replay durable state
    - compare durable and host sequences
    - resume only after reconciliation
  storage_quota_or_eviction: follow rule:continuous-project-recovery
non_goals:
  - canonical project authority
  - edit conflict resolution
  - RTCPeerConnection ownership
  - surviving page or browser termination as a background process
```
