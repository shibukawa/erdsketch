---
id: ui:canvas-ownership-transfer-dialog
type: ui
title: Canvas Ownership Transfer Dialog
---

Users transfer a model's primary responsibility to another ERD canvas with an explicit effect preview.

```yaml
ui:
  root:
    kind: dialog
    id: canvas-ownership-transfer
    title: Change owner canvas
    children:
      - kind: summary
        id: ownership-transfer-model
        fields:
          - model_name
          - model_role
          - current_owner_canvas
      - kind: select
        id: target-owner-canvas
        source: data:project
        excludes:
          - current_owner_canvas
      - kind: preview
        id: ownership-transfer-effects
        fields:
          - previous_owner_becomes_readonly
          - target_becomes_owner
          - target_placement_will_be_created
      - kind: button
        label: Transfer ownership
        action: flow:transfer-canvas-model-ownership
      - kind: button
        label: Cancel
        action: close_without_change
constraints:
  - Confirmation is disabled until a target canvas is selected.
  - The dialog states whether the target already contains a readonly placement.
  - The dialog warns that editing authority moves to the target canvas.
  - Models without exclusive ownership use their applicable shared or master policy instead of this dialog.
```
