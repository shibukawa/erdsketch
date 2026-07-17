---
id: requirement:workspace-start-project-selection
type: requirement
title: Workspace Start Project Selection
---

The host chooses project content before choosing an ERD or DFD workspace.

```yaml
surface: ui:workspace-start-panel
project_sources:
  - empty_project
  - data:starter-project-template
  - requirement:named-opfs-project-management
  - system:browser-local-file-adapter
  - system:native-project-file-adapter
  - system:wails-project-file-adapter
  - data:portable-project-archive
sequence:
  first: select_or_create_data:project
  second: ui:project-canvas-selector-dialog
  forbidden_first_choice:
    - erd
    - dfd
empty_project:
  includes:
    - empty_data:model-catalog
    - empty_domain_dictionary
    - empty_vocabulary
    - one_empty_erd_canvas
    - one_empty_data:dfd-canvas
saved_project_discovery:
  automatic:
    - named_OPFS_projects
    - recoverable_temporary_OPFS_projects
    - remembered_external_handles_when_platform_permission_allows
    - configured_native_projects_in_go_backend_mode
    - recent_native_projects_in_wails_desktop_mode
  never:
    - scan_arbitrary_local_disk
    - imply_access_without_user_permission
open_actions:
  - upload_or_import_portable_archive
  - choose_local_project_file_or_directory_when_supported
startup_precedence:
  before_panel:
    - invitation_fragment_routes_to_flow:join-shared-work
    - participant_checkpoint_routes_to_recovery_choice
  panel_candidate:
    - last_active_recoverable_project
    - other_saved_projects
acceptance:
  - Every normal host startup shows ui:workspace-start-panel until a project source is chosen.
  - ui:language-selector is available before project selection and does not require opening ERD or DFD.
  - Empty, Todo, Blog, and Help Desk are visible together.
  - Starter cards show summary, level, and model, domain, vocabulary, ERD, and DFD counts.
  - Saved and temporary OPFS projects are visible without opening ui:project-management-dialog.
  - A last-active recovery candidate is labeled Resume and is not silently installed before selection.
  - Local upload and supported file or directory picker actions are visible on the panel.
  - Unsupported picker APIs show an explanation and retain archive upload.
  - Choosing any source validates and installs the complete project atomically.
  - Failed selection keeps the panel open and preserves the previous recoverable project.
  - Successful selection opens ui:project-canvas-selector-dialog before either diagram workspace.
  - Collaboration participants do not see host project replacement controls.
```
