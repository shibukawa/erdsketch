---
id: ui:erd-model-sidebar
type: ui
title: ERD Model Sidebar
---

The ERD sidebar groups model editing and maturity validation for the current selection.

```yaml
ui:
  root:
    kind: sidebar
    id: erd-model-sidebar
    target: selected_model
    sections:
      - kind: section
        id: edit
        title: Edit
        children:
          - model_name
          - model_description
          - model_role
          - model_dependency
          - model_privacy
          - open ui:field-list-dialog
          - requirement:model-removal
        excluded:
          - manual_model_state_control
          - manual_maturity_control
      - kind: section
        id: validation
        title: Validation
        children:
          - current_automatic_maturity
          - requirement:erd-maturity-validation
section_order:
  - edit
  - validation
empty_state: select_one_model
```

Constraints:

- Section titles localize through requirement:user-interface-localization.
- Display controls belong to ui:model-card-display-mode on the canvas; edit and validation target the selected model.
- Maturity is read-only output from rule:model-maturity-assessment.
