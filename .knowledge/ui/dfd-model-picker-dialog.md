---
id: ui:dfd-model-picker-dialog
type: ui
title: DFD Model Picker Dialog
---

Users search project models and select one to place on the current DFD canvas.

```yaml
ui:
  root:
    kind: dialog
    id: dfd-model-picker
    title: Select Model
    source: data:model-catalog
    children:
      - kind: search
        id: model-search
      - kind: checkbox
        id: independent-only
        label: Parent tables only
        default: true
        filter:
          field: dependency
          equals: independent
      - kind: model_list
        id: selectable-models
        excludes:
          - models_already_placed_on_current_dfd
        fields:
          - name
          - role
          - dependency
          - usage_scope
      - kind: button
        id: place-model
        label: Place
        action: create data:dfd-node-placement
constraints:
  - Turning Parent tables only off includes Dependent table models without warning.
  - Both shared and dfd_only models are eligible.
  - Search applies after the Parent tables only filter.
  - Selecting an already placed model focuses its existing placement instead of duplicating it.
```
