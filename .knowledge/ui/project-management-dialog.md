---
id: ui:project-management-dialog
type: ui
title: Project Management Dialog
---

The host manages project storage locations and portable exchange from one dialog.

```yaml
ui:
  root:
    kind: dialog
    id: project-management
    title: Project Management
    children:
      - kind: tabs
        id: project-storage-tabs
        children:
          - kind: tab
            id: origin-private-storage
            label: Origin Private Storage
            children:
              - kind: project-list
                source: requirement:named-opfs-project-management
                item_actions:
                  - load
                  - rename
                  - delete_with_confirmation
              - kind: project-actions
                actions:
                  - create_named_project
                  - save_as_named_project
              - kind: portable-exchange
                contract: data:portable-project-archive
                actions:
                  - import_archive
                  - export_archive
          - kind: tab
            id: file-system
            label: File System
            target: system:browser-local-file-adapter
            children:
              - kind: file-actions
                actions:
                  - open_project_from_selected_file_or_directory
                  - save_project_to_selected_file_or_directory
              - kind: capability-state
                states:
                  - available
                  - unavailable_with_explanation
entry_point: ui:workspace-data-navigation
behavior:
  default_tab: origin-private-storage
  file_system_capability: runtime_feature_detection
  unsupported_file_system:
    keep_tab_visible: true
    disable_picker_actions: true
    explain_browser_limitation: true
    alternatives:
      - system:origin-private-project-store
      - import_data:portable-project-archive
      - export_data:portable-project-archive
constraints:
  - Import and export are available inside the dialog rather than as workspace-header buttons.
  - File System actions never imply that OPFS continuous recovery is disabled.
  - Closing the dialog does not change the active project.
  - Non-host participants see project storage as host-managed and cannot run durable actions.
```
