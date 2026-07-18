---
id: requirement:named-opfs-project-management
type: requirement
title: Named OPFS Project Management
---

The session host manages named projects and recoverable temporary workspaces in system:origin-private-project-store.

```yaml
identity:
  project_id:
    purpose: stable_internal_key
    mutable: false
    independent_from_display_name: true
  display_name:
    purpose: user_visible_project_name
    required_for_named_project: true
    rename_preserves_project_id: true
project_kinds:
  named:
    listed_in_project_picker: true
    continuously_recovered: true
  temporary:
    listed_in_recovery_section: true
    continuously_recovered: true
    promote_with: save_as
operations:
  - create_named_project
  - save
  - save_as
  - list_named_and_temporary_projects
  - load_by_project_id
  - rename
  - delete_with_confirmation
save_as:
  source: data:project-document-set
  result:
    - allocate_new_project_id
    - write_named_checkpoint
    - switch_active_project
    - retain_continuous_recovery
load:
  before_switch: checkpoint_current_project_when_dirty
  failure: preserve_current_memory_and_active_project
recovery_scope:
  journal:
    contract: data:project-recovery-journal
    cardinality: one_per_project_id
  checkpoint: one_active_checkpoint_chain_per_project_id
  current_project: restore_last_active_project_after_restart
authority:
  mutate_catalog: actor:session-host
  execute_catalog_and_project_io: system:persistence-worker
  participant: request_host_action_or_read_host_snapshot
multi_tab_open: requirement:same-origin-multi-tab-project-editing
surface:
  dialog: ui:project-management-dialog
  tab: origin-private-storage
  launch_panel: ui:workspace-start-panel
acceptance:
  - Users can assign a name when creating or saving a project in OPFS.
  - Users can load a named OPFS project from an origin-local project list.
  - An unnamed workspace survives restart as a temporary recoverable project.
  - Save As never overwrites another project solely because display names match.
  - Renaming does not change recovery identity or journal ownership.
  - Deleting a project removes its checkpoint and journal only after confirmation.
  - OPFS names do not imply real filesystem paths or cross-origin visibility.
  - Writable open follows flow:open-origin-project-across-tabs for the same origin and project ID.
  - Named and temporary project actions are available from the Origin Private Storage tab.
```
