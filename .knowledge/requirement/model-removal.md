---
id: requirement:model-removal
type: requirement
title: Model Removal
---

Users remove the selected model from the ERD sidebar with ownership-aware scope.

```yaml
entry:
  surface: ui:erd-model-sidebar
  section: edit
  control:
    kind: button
    label: Delete
    visual: red_text
scope_rule:
  owner_placement:
    condition: current data:canvas-model-placement access_mode is owner
    authority: rule:canvas-model-ownership
    action:
      - confirm_project_model_deletion
      - delete model definition from data:model-catalog
      - delete_all_data:canvas-model-placement_records
      - remove_all_erd_and_dfd_references_to_model
    confirmation:
      required: true
      explains:
        - model_is_deleted_from_project
        - all_canvas_placements_are_removed
      destructive_action_label: Delete from project
  non_owner_placement:
    condition: current data:canvas-model-placement access_mode is readonly
    action: delete current data:canvas-model-placement only
    confirmation: false
    project_model_definition: preserved
    other_placements: preserved
collaboration:
  commit: atomic
  undo_unit: one
```

Constraints:

- Delete is available even when model-definition editing is readonly.
- A non-owner canvas never deletes the shared model definition.
- Project deletion is not executed until the confirmation dialog is accepted.
