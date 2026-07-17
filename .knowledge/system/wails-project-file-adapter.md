---
id: system:wails-project-file-adapter
type: system
title: Wails Project File Adapter
---

Wails project file adapter exposes native project persistence to the desktop frontend through generated bindings.

```yaml
availability: wails_desktop_mode
boundary: generated_Wails_bindings
surface:
  launch_panel: ui:workspace-start-panel
  management_dialog: ui:project-management-dialog
operations:
  - choose_project_location
  - list_recent_projects
  - load_data:project-document-set
  - save_data:project-document-set
  - import_data:portable-project-archive
  - export_data:portable-project-archive
storage:
  user_projects: user_selected_location
save:
  behavior: atomic_replace_when_supported
  requirements:
    - write temporary sibling
    - flush and close before replacement
    - preserve previous project on failure
security:
  - Validate normalized logical paths before native access.
  - Return opaque project handles or identifiers to shared frontend state.
  - Do not expose unrestricted filesystem methods to JavaScript.
constraints:
  - Native dialogs and filesystem calls execute in Go.
  - Adapter failures are ordinary recoverable UI errors.
  - Go services remain independent of Wails-generated binding types.
```
