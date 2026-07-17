---
id: ui:relationship-view
type: ui
title: Relationship View
---

Users create and edit semantic relationships directly on the canvas.

```yaml
ui:
  root:
    kind: view
    id: relationship-view
    children:
      - kind: relationship-editor
        item: data:relationship
        create:
          start: drag_chain_handle_on_selected_model
          finish: drop_on_other_model
          result: open_relationship_editor
        editable_fields:
          - name
          - reading_direction
          - source_multiplicity
          - target_multiplicity
          - on_delete
        name:
          count: one
        reading_direction:
          control: arrow_direction_selector
          values:
            - source_to_target
            - target_to_source
          examples:
            ownership: parent_to_child
            dependency: dependent_to_independent
        cardinality_presets:
          - one_to_many
          - many_to_one
          - many_to_many
        optionality:
          notation: UML
          endpoint_values:
            - "0..1"
            - "1"
            - "0..*"
            - "1..*"
        on_delete:
          item: data:referential-action
          visible_when: relationship_exports_foreign_key
          default: no_action
          composition:
            value: cascade
            editable: false
        canvas_line:
          geometry: soft_curve
          preserve_existing_style: true
          roughness: rule:relationship-roughness
          endpoint_labels: UML_multiplicity
          arrow: selected_reading_direction
          avoid: ERD_crows_foot_notation
          composition:
            owner_endpoint: filled_black_diamond
            child_endpoint: no_diamond
        delete:
          confirmation_required: true
          warning: Relationship and its projected reference field will disappear.
        editable_types:
          - has-a
          - is-a
          - composition
          - Aggregation
          - dependent
        editable_semantics:
          - ownership
          - lifecycle_dependency
          - delete_behavior
          - identity_scope
related:
  - data:relationship
  - requirement:relationship-management
  - rule:dependent-drag-follow
  - rule:relationship-roughness
  - data:referential-action
```
