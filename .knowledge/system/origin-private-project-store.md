---
id: system:origin-private-project-store
type: system
title: Origin-Private Project Store
---

Origin-private project store is the browser-managed recovery store used by every browser runtime mode.

```yaml
availability:
  runtime:
    - go_backend_mode
    - static_content_mode
    - wails_desktop_mode
  API: navigator.storage.getDirectory
visibility: origin_private
execution:
  owner: system:persistence-worker
  preferred_file_access: FileSystemSyncAccessHandle_in_dedicated_worker
  fallback_file_access: asynchronous_OPFS_file_streams
operations:
  - list_projects
  - requirement:named-opfs-project-management
  - load_data:project-document-set
  - save_data:project-document-set
  - append_data:project-recovery-journal
  - recover_project_after_restart
role:
  all_modes: continuous_recovery_store
  static_without_external_handle: primary_working_store
  wails_desktop: continuous_recovery_store
  user_visible_backup: data:portable-project-archive
project_catalog:
  key: immutable_project_id
  label: mutable_display_name
  entries:
    - named_project
    - recoverable_temporary_workspace
  active_project: restored_after_restart
durability:
  request: navigator.storage.persist
  quota: navigator.storage.estimate
  write_rule: rule:continuous-project-recovery
concurrency:
  in_tab: serialized_by_system:persistence-worker
  cross_tab: project_scoped_Web_Lock_before_writable_open
constraints:
  - Data is scoped to the web origin and is not represented as a user-visible path.
  - Origin changes do not imply data migration.
  - Storage eviction and quota failures stop acknowledgement of new durable mutations.
  - Private browsing or unavailable APIs are detected before editing begins.
  - Export remains available so users are not trapped in origin-private storage.
  - OPFS is recovery storage, not the only backup against site-data deletion or device loss.
```
