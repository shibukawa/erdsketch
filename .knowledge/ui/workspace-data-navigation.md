---
id: ui:workspace-data-navigation
type: ui
title: Workspace Data Navigation
---

Workspace navigation presents coarse project scope before the finer canvas scope.

```yaml
ui:
  root:
    kind: header-actions
    id: workspace-data-navigation
    children:
      - kind: button
        id: project-management-button
        label: Project
        target: ui:project-management-dialog
      - kind: button
        id: canvas-selector-button
        label: Canvas
        target: ui:erd-canvas-selector-dialog
order:
  - project_management
  - canvas_selection
hierarchy:
  project:
    contains: many_canvases
    granularity: coarse
  canvas:
    belongs_to: one_data:project
    granularity: fine
header_exclusions:
  - standalone_open_button
  - standalone_save_button
  - standalone_import_button
  - standalone_project_archive_export_button
constraints:
  - One project-management entry point replaces separate workspace file controls.
  - The active project remains identifiable from the project button.
  - The active canvas remains identifiable from the canvas button.
  - Artifact generation uses ui:workspace-header and ui:export-dialog, independently from project archive storage.
```
