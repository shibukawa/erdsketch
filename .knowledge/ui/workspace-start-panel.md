---
id: ui:workspace-start-panel
type: ui
title: Workspace Start Panel
---

Workspace start panel is the host launch surface for choosing project content, not diagram kind.

```yaml
ui:
  root:
    kind: modal_panel
    id: workspace-start
    title: Start or open a project
    children:
      - kind: ui:language-selector
        id: interface_language
        placement: header
      - kind: section
        id: starters
        title: New project
        children:
          - kind: starter_card
            id: empty
            action: create_empty_project
          - kind: starter_card
            id: todo
            source: data:todo-starter-project
          - kind: starter_card
            id: blog
            source: data:blog-starter-project
          - kind: starter_card
            id: help_desk
            source: data:help-desk-starter-project
      - kind: section
        id: saved_projects
        title: Continue
        children:
          - kind: project_list
            source: requirement:named-opfs-project-management
            groups:
              - resume_last_active
              - named_projects
              - temporary_recovery
            item_fields:
              - display_name
              - last_modified
              - storage_kind
          - kind: known_external_file_list
            source: decision:storage-adapter-selection
            state:
              - available_with_permission
              - unavailable
      - kind: section
        id: open_project
        title: Open another project
        children:
          - kind: button
            id: import_archive
            action: import_data:portable-project-archive
          - kind: button
            id: choose_local
            action: system:browser-local-file-adapter
          - kind: capability_state
            id: local_file_capability
  footer:
    kind: button
    id: manage_projects
    target: ui:project-management-dialog
starter_card_fields:
  - title
  - summary
  - level
  - model_count
  - domain_count
  - vocabulary_count
  - erd_canvas_count
  - dfd_canvas_count
behavior:
  selection: flow:start-project-from-launch-panel
  busy: disable_project_source_actions
  failure: show_inline_error_and_keep_panel_open
  after_success: open_ui:project-canvas-selector-dialog
constraints:
  - ERD and DFD choice cards do not appear on this panel.
  - This panel is the only interactive language-selection surface.
  - Saved projects and open actions are first-class content, not hidden behind the project manager.
  - The panel never displays an invented local path for OPFS projects.
  - The panel never claims to enumerate local disk when browser permission is absent.
```
