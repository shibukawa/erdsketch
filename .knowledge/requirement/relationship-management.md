---
id: requirement:relationship-management
type: requirement
title: Relationship Management
---

Users model named semantic relationships independently from SQL schema primitives.

```yaml
requirements:
  creation:
    prerequisite: one_model_selected
    affordance: chain_handle_on_selected_card
    interaction: drag_handle_and_drop_on_another_model
    result: create_and_edit_data:relationship
  editing:
    fields:
      - name
      - reading_direction
      - source_multiplicity
      - target_multiplicity
    presets:
      - one_to_many
      - many_to_one
      - many_to_many
    optionality_supported: true
  semantics:
    first_class_relationship: true
    editor_representation: relationship_entity_for_all_multiplicities
    independent_from_sql_foreign_key: true
    single_name: true
    arrow_direction:
      selectable: true
      values:
        - source_to_target
        - target_to_source
      follows_relationship_meaning: true
    name_example: ownership
    separate_relationship_flag: false
    kinds:
      foreign_key:
        sql_effect: cardinality_based_reference_projection
      inherit:
        direction: child_to_parent
        sql_effect: rule:inherit-attribute-projection
      label:
        sql_effect: none
        display: relationship_name_only
        multiplicity: none
        reading_direction: none
  export_projection:
    timing: code_export
    one_to_many_or_many_to_one:
      relationship_name_becomes: foreign_key_reference_name
    many_to_many:
      relationship_name_becomes: join_table_name
  rendering:
    line: existing_soft_curve
    roughness: rule:relationship-roughness
    multiplicity_notation: UML
    examples:
      - "0..1"
      - "1"
      - "0..*"
      - "1..*"
    exclude: ERD_crows_foot
  field_projection:
    visibility:
      one_to_many: many_endpoint
      many_to_one: many_endpoint
      one_to_one: arrow_origin_endpoint
      many_to_many: both_endpoints
    changes_are_presentation_only: true
    model_ownership: none
    content:
      - chain_icon
      - relationship_name
    persisted_as: data:relationship-reference
    separate_from: data:attribute
    editable_flags:
      - primary_key
      - foreign_key
    flag_behavior:
      independent: true
      primary_key_and_foreign_key_allowed: true
  deletion:
    trigger: delete_relationship_or_projected_reference
    confirmation_required: true
    message_intent: confirm_relationship_loss
  movement:
    follow: rule:dependent-drag-follow
    lock: rule:relationship-move-lock
  history: rule:relationship-operation-history
  validation: requirement:relationship-validation
acceptance:
  - Dragging a selected card's chain handle to another model starts relationship creation.
  - Users can name the relationship and express one-to-many, many-to-one, many-to-many, and optional endpoints.
  - Each relationship has one name and a selectable reading-arrow direction.
  - The relationship name becomes a foreign-key reference name for one-to-many export and a join-table name for many-to-many export.
  - Before code export, every multiplicity remains represented as a relationship entity.
  - Diagram labels use UML multiplicities while relationship curves retain their current soft shape.
  - Relationship roughness equals the arithmetic mean of the two endpoint model roughness values and updates when either endpoint changes.
  - A one-to-many relationship creates a linked reference entry only in the many-side field list.
  - Flipping one-to-many and many-to-one preserves the same relationship reference and flags while changing only list projection.
  - One-to-one projects at the arrow origin; many-to-many projects at both endpoints.
  - The linked reference is persisted separately from attributes although both appear in the same field list.
  - The linked reference shows a chain icon and relationship name; primary-key and foreign-key flags are independent and may both be enabled.
  - Deleting the relationship or linked reference asks for confirmation and explains that the relationship disappears.
  - Relationship meaning remains available even when it has no SQL representation.
  - Inherit export creates a child table containing all effective parent attributes and the child's own attributes.
  - Label relationships display only their name, have no multiplicity or reading direction, and never alter SQL output.
  - A relationship projection may be hidden on one model without deleting the relationship or changing SQL output.
  - Hidden relationships do not propagate grouped drag movement to connected models beyond them.
  - Dragging a dependent moves every independent reachable through dependency direction, including offscreen models.
  - The complete movement set is locked atomically before movement; failure to lock any model prevents the drag.
  - Cyclic dependencies are allowed and each model in a cycle moves at most once per drag.
  - One undo operation restores every model moved by the drag.
  - Primitive history changes are applied, undone, and redone as one user operation.
  - Persisted relationship inconsistency is reported as an error.
related:
  - data:relationship
  - ui:relationship-view
  - requirement:field-list-management
  - rule:dependent-drag-follow
  - rule:relationship-move-lock
  - data:relationship-reference
  - rule:relationship-operation-history
  - requirement:relationship-validation
  - rule:relationship-roughness
  - rule:inherit-attribute-projection
```
