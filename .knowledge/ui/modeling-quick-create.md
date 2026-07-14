---
id: ui:modeling-quick-create
type: ui
title: Modeling Quick Create
---

ERD and DFD use the same persistent name-entry pattern for rapid item creation.

```yaml
ui:
  root:
    kind: quick_create
    id: modeling-quick-create
    children:
      - kind: radio_group
        id: item-type
        dfd_options:
          - batch
          - ui
          - model
          - file
          - queue
          - external
        erd_option: model
      - kind: input
        id: item-name
        submit_key: Enter
behavior:
  submit:
    precondition: trimmed_name_is_not_empty
    action: create_selected_type_at_next_canvas_position
    after:
      - clear_name
      - retain_selected_type
      - focus_name_input
  repeated_creation: true
  per_item_creation_dialog: false
  details_after_creation: edit_selected_item
model_creation:
  definition: data:model-catalog
  placement:
    erd: data:canvas-model-placement
    dfd: data:dfd-node-placement
constraints:
  - DFD type controls behave as one radio group, not independent action buttons.
  - Enter creates exactly one item using the currently selected type.
  - Quick creation supplies defaults for metadata not represented by name and type.
```
