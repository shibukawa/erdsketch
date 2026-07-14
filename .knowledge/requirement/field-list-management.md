---
id: requirement:field-list-management
type: requirement
title: Field List Management
---

Users manage a model seed's fields without leaving the canvas.

```yaml
requirements:
  entry_point:
    locations:
      - erd_model_card_top_right
      - selected_dfd_model
    control: compact_menu_icon
    action: open ui:field-list-dialog
  create:
    interaction: type_field_name_then_press_Enter
    result: append_field_and_keep_input_ready
    repeatable: true
    trim_whitespace: true
    reject_empty_name: true
    ime:
      composition_Enter: confirm_composition_only
      add_on_Enter: only_when_not_composing
  edit:
    interaction: click_existing_field
    editable:
      - name
      - primary_key
      - important
  domain_assignment:
    source: ui:domain-dictionary-panel
    interaction: drag_domain_to_attribute_row
    stores_reference_to: data:data-domain
    composite_display: one_logical_row
    physical_projection: rule:domain-expansion
    key_projection: rule:domain-key-projection
  relationship_reference:
    item: data:relationship-reference
    source: data:relationship
    persistence: separate_from_data:attribute
    visibility:
      one_to_many: many_endpoint
      many_to_one: many_endpoint
      one_to_one: arrow_origin_endpoint
      many_to_many: both_endpoints
    model_ownership: none
    presentation:
      icon: chain
      label: relationship_name
    editable_flags:
      - primary_key
      - foreign_key
    flag_behavior:
      independent: true
      primary_key_and_foreign_key_allowed: true
    visibility_control:
      scope: projected_model
      action: hide_or_show_on_canvas
      persistence: data:relationship-reference.hidden_on_model_ids
      dialog_row_remains_visible: true
      affects_sql_export: false
    deletion:
      effect: delete_relationship
      confirmation_required: true
  list_projection:
    presents_together:
      - data:attribute
      - data:relationship-reference
    common_visual_row: true
    common_storage_collection: false
    common_domain_type: false
    relationship_reference_name_source: data:relationship.name
    sort: rule:field-list-sort
  flags:
    primary_key: schema_meaning
    important: visual_emphasis_only
    implication: primary_key_sets_important_true
    independent_favorite: important_may_be_true_without_primary_key
  excluded:
    - foreign_key_assignment
    - relationship_creation_from_field_editor
acceptance:
  - ERD and DFD show the same hamburger-like field action for a model.
  - Editing fields from either canvas updates one shared data:model-catalog definition.
  - Repeated typing and Enter appends multiple fields without reopening the dialog.
  - Japanese IME confirmation never creates an unintended field.
  - Clicking a field exposes editing for its name and flags.
  - Setting primary key automatically sets important.
  - A field may be important without being a primary key.
  - A primary-key field remains effectively important.
  - Important never changes SQL meaning.
  - A projected relationship reference appears on the many-side field list with a chain icon and relationship name.
  - Attributes and relationship references appear in one list but remain different domain and persistence types.
  - Saving or loading a relationship reference never converts it into an attribute.
  - Changing one-to-many to many-to-one preserves reference identity and flags; only its displayed model changes.
  - One-to-one appears on the arrow-origin model and many-to-many appears on both models.
  - After save, primary-key items appear first, foreign-key-only items second, and all other items last.
  - Removing a projected relationship reference requires confirmation because it removes the relationship.
  - Hiding a relationship reference removes it from that model's canvas field projection and hides the relationship line while retaining its row in the field-list dialog.
  - Users can show a hidden relationship reference again from the field-list dialog.
  - Hide or show does not delete the relationship, change other endpoint visibility, or affect SQL export.
  - A domain can be assigned to an attribute from the adjacent dictionary panel.
  - A composite domain remains one field-list row.
  - Domain shape and completeness never restrict assignment.
related:
  - data:attribute
  - data:relationship
  - ui:field-list-dialog
  - rule:primary-key-favorite
  - requirement:relationship-management
  - data:relationship-reference
  - rule:field-list-sort
  - requirement:domain-dictionary-management
  - ui:domain-dictionary-panel
  - data:data-domain
  - rule:domain-expansion
```
