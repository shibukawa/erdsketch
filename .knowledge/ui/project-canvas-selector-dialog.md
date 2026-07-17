---
id: ui:project-canvas-selector-dialog
type: ui
title: Project Canvas Selector Dialog
---

Project canvas selector is the second launch step after data:project selection and the shared navigation surface thereafter.

```yaml
ui:
  root:
    kind: dialog
    id: project-canvas-selector
    title: ERD and DFD canvases
    children:
      - kind: canvas_section
        id: erd_canvases
        source: ui:erd-sketch-canvas
        actions: [open, create, rename]
      - kind: canvas_section
        id: dfd_canvases
        source: data:dfd-canvas
        actions: [open, create, rename]
launch_behavior:
  trigger: flow:start-project-from-launch-panel succeeds
  required_choice: one_existing_or_new_canvas
  open_result:
    erd: ui:erd-sketch-canvas
    dfd: ui:dfd-sketch-canvas
subsequent_behavior:
  entry_point: workspace_header
  switching: no_project_migration
canvas_item:
  primary_action: open
  hit_target: full_item_row_except_rename_action
  keyboard_accessible: true
constraints:
  - Project source selection is complete before this dialog opens.
  - Starter templates do not force a preferred diagram kind.
  - ERD and DFD reuse the same data:model-catalog, domain dictionary, and vocabulary.
  - Canvas selection never restricts its click target to label glyphs or text bounds.
```
