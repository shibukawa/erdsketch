# Model Refinement Patterns

Profile: `review`

| ID | Type | Title |
| --- | --- | --- |
| `requirement:model-refinement-patterns` | `requirement` | Model Refinement Patterns |
| `data:attribute` | `data` | Attribute |
| `data:create-history-pattern` | `data` | Create History Model Pattern |
| `data:create-work-pattern` | `data` | Create Work Pattern |
| `data:data-domain` | `data` | Data Domain |
| `data:extract-domain-pattern` | `data` | Extract New Domain Pattern |
| `data:extract-master-pattern` | `data` | Extract New Master Pattern |
| `data:extract-one-to-one-pattern` | `data` | Extract Model One-to-One Pattern |
| `data:extract-optional-model-pattern` | `data` | Extract Optional Model Pattern |
| `data:model-transformation` | `data` | Model Transformation |
| `data:multiple-items-pattern` | `data` | Multiple Items Pattern |
| `data:split-by-code-set-pattern` | `data` | Split Model by Code Set Pattern |
| `requirement:design-decision-history` | `requirement` | Design Decision History |
| `requirement:field-list-management` | `requirement` | Field List Management |
| `requirement:normalization-support` | `requirement` | Normalization Support |
| `ui:model-refinement-panel` | `ui` | Model Refinement Panel |

## requirement:model-refinement-patterns

Users evolve rough sketches into usable models through explicit, guided transformations. Unlike compatibility-preserving refactoring, refinement may add or change modeled semantics to realize new capability.

```yaml
scope:
  field_selection:
    - data:extract-master-pattern
    - data:extract-domain-pattern
    - data:create-history-pattern
    - data:multiple-items-pattern
    - data:extract-optional-model-pattern
    - data:extract-one-to-one-pattern
    - data:split-by-code-set-pattern
  model_selection:
    - data:create-work-pattern
application:
  preview_required: true
  atomic: true
  cancel_has_no_effect: true
  records_decision: requirement:design-decision-history
  preserves_unaffected_order: true
  generated_names_must_be_unique: true
  invalid_submission: blocked_with_inline_reason
shared_key_input:
  modes:
    selected_fields:
      minimum: 1
      composite_allowed: true
      source: selected data:attribute items
    new_field:
      fields:
        - name
        - data:data-domain
      reuse: existing field name and domain controls
  exactly_one_mode: true
selection_identity:
  stable_ids_required: true
  reason: names and indexes may change during transformation
```

related:
  - ui:model-refinement-panel
  - data:model-transformation
  - requirement:normalization-support
  - requirement:field-list-management

## data:attribute

Attribute is an editable property of data:entity.

```yaml
fields:
  - name: id
    type: identifier
  - name: name
    type: text
  - name: data_type
    type: text
    optional: true
  - name: domain
    type: data:data-domain
    optional: true
  - name: required
    type: boolean
  - name: unique
    type: boolean
  - name: primary_key
    type: boolean
    default: false
  - name: important
    type: boolean
    default: false
    semantic: visual_emphasis_only
  - name: description
    type: text
operations:
  - add
  - remove
  - edit
  - move_to_another_entity
constraints:
  - When domain is assigned, its definition is authoritative over an independently entered data_type.
  - Composite domain assignment remains one logical attribute and expands through rule:domain-expansion.
  - Domain shape does not change the attribute count in logical editing or model-card display.
  - A key flag belongs to the logical attribute and projects to physical columns through rule:domain-key-projection.
  - Attribute records and data:relationship-reference records use separate collections and persistence schemas.
  - Attribute never stores a relationship reference discriminator or relationship ID.
  - important has no SQL or schema-generation semantics.
  - primary_key implies important according to rule:primary-key-favorite.
  - important may be true without primary_key.
  - A primary-key attribute cannot have an effective important value of false.
  - Foreign-key assignment is outside field-list editing; data:relationship owns relationships.
normalization_support:
  example:
    from: Order.product_name
    to: Product.name
  records_decision: requirement:design-decision-history
related:
  - requirement:field-list-management
  - ui:field-list-dialog
  - rule:primary-key-favorite
  - data:relationship-reference
  - data:data-domain
  - rule:domain-expansion
  - rule:domain-key-projection
```

## data:create-history-pattern

Move or copy selected state into a transaction/history model with explicit temporal identity.

```yaml
description: Track changes to selected fields over time or versions.
preconditions:
  context: ui:field-list-dialog
  selected_rows_minimum: 1
  source_primary_key_minimum: 1
inputs:
  - history_model_name
  - storage_mode
  - current_model_name_when_storage_mode_is_dedicated_current
  - temporal_key_mode
  - temporal_key_names
storage_modes:
  keep_on_source: selected rows remain on source
  history_only: selected rows are removed from source
  dedicated_current: selected rows are removed from source and copied to a named current model
temporal_key_modes:
  instant: one date or datetime field
  version: one version field
  range: start and end date or datetime fields; only end is a key
actions:
  - create a dependent history model with role history
  - copy source primary keys and selected rows to history
  - create temporal fields and mark the instant, version, or range end field as primary key
  - when storage_mode is not keep_on_source remove selected rows from source
  - when storage_mode is dedicated_current create a dependent current model inheriting the source role and copy selected rows to it
  - when storage_mode is keep_on_source connect history and source with a label relationship whose semantic role is history
  - otherwise connect history to source with an N:1 relationship
  - when selected relationship references remain on source, hide their history-side projections
constraints:
  - History and dedicated current models depend on the source identity and lifecycle.
  - Copied source primary keys retain their key role in history.
  - storage_mode and temporal_key_mode each select exactly one value.
  - temporal key names are unique within history.
  - Range start is not a primary key.
  - Ranges for the same source identity are assumed not to overlap; this pattern does not add overlap enforcement.
```

related:
  - requirement:model-refinement-patterns
  - data:relationship
  - data:relationship-reference
  - data:time-characteristic
  - data:dependent-entity

## data:create-work-pattern

Clone a selected model as a work model for replacement loads, raw inbound data, or retained outbound data.

```yaml
description: Create a same-shaped work model for transient or boundary processing.
preconditions:
  context: ui:erd-sketch-canvas
  selected_models: exactly_one
inputs:
  - new_model_name
actions:
  - create a model inheriting source independence/dependence and role
  - copy all source fields in order with domains and flags
  - copy every relationship incident to source with equivalent direction, type, multiplicity, and flags
  - mark every copied relationship projection hidden on the work model
constraints:
  - Source model and relationships are unchanged.
  - Hidden relationship projections remain present in the field-list dialog and physical export according to data:relationship-reference.
```

related:
  - requirement:model-refinement-patterns
  - ui:erd-sketch-canvas
  - data:entity
  - data:relationship
  - data:relationship-reference

## data:data-domain

Data domain is a named reusable semantic type assigned consistently across models.

```yaml
examples:
  user_id:
    definition_state: defined
    category: single_field
    primitive_type: varchar
    parameters:
      length: 6
  customer:
    definition_state: defined
    category: multi_field
    components:
      - tenant_id
      - user_code
definition_state:
  unresolved:
    primitive_type: undefined
    components: []
    assignable: true
  defined:
    assignable: true
category:
  built_in_primitive:
    source: data:primitive-type
  unresolved: {}
  single_field:
    components: 1
  multi_field:
    components: many
component: data:domain-component
base_type: data:primitive-type
constraints:
  - A domain name identifies one stable semantic type.
  - Quick creation produces definition_state unresolved; it never assumes varchar or another type.
  - A defined single-field domain resolves to data:primitive-type.
  - A defined multi-field component resolves to a defined single-field data:data-domain.
  - All attributes assigned the same domain share its type definition.
  - Composite domains are one logical field in editing surfaces.
  - Assignment never depends on definition state or component count.
  - Definition completeness is validated only when a physical artifact requires expansion.
  - Domain definition changes propagate to every assignment.
related:
  - data:attribute
  - requirement:domain-dictionary-management
  - rule:domain-expansion
  - rule:domain-key-projection
```

## data:extract-domain-pattern

Replace one or more similar attributes with a reusable single- or multi-component domain.

```yaml
description: Convert selected fields and checked similar field groups into one domain assignment.
preconditions:
  context: ui:field-list-dialog
  selected_attributes_minimum: 1
  relationship_references_allowed: false
inputs:
  - domain_name
  - ordered_component_names
  - checked_similar_models
similar_candidates:
  includes:
    - close_edit_distance
    - partial_match_against_multiple_selected_names
  display:
    - model_name
    - matched_field_names
  source_model:
    checked: true
    locked: true
actions:
  - create data:data-domain using ordered_component_names
  - for each checked model remove the matched attributes
  - insert one domain-backed attribute at the lowest removed attribute index
  - set use_domain_name true on each inserted attribute
constraints:
  - Candidate discovery never changes data until apply.
  - Each checked model must contain a complete, unambiguous match for the chosen components.
  - Non-matched attributes retain relative order.
```

related:
  - requirement:model-refinement-patterns
  - data:data-domain
  - data:attribute
  - rule:domain-expansion

## data:extract-master-pattern

Extract selected fields into a new independent master model and reference it from the source model.

```yaml
description: Create a reusable master containing selected fields.
preconditions:
  context: ui:field-list-dialog
  selected_rows_minimum: 1
inputs:
  - master_model_name
  - requirement:model-refinement-patterns.shared_key_input
  - keep_snapshot_in_source
actions:
  - create model with independence independent and role master
  - copy selected rows to the master in source order
  - add the new key when new_field key mode is used
  - set selected or new master key fields as primary keys
  - remove selected rows from source when keep_snapshot_in_source is false
  - create source N:1 master data:relationship
  - when snapshot is kept and a selected relationship reference is reproduced by the new source-to-master relationship, mark the old source projection hidden
constraints:
  - Unselected source fields and relationships are unchanged.
  - Hiding a relationship projection uses data:relationship-reference.hidden_on_model_ids and does not delete the relationship.
```

related:
  - requirement:model-refinement-patterns
  - data:entity
  - data:relationship
  - data:relationship-reference

## data:extract-one-to-one-pattern

Separate fields for visibility, sensitivity, update-frequency, or payload-size concerns while retaining mandatory one-to-one identity.

```yaml
description: Split fields into a mandatory one-to-one model.
preconditions:
  context: ui:field-list-dialog
  selected_rows_minimum: 1
inputs:
  - new_model_name
  - requirement:model-refinement-patterns.shared_key_input
actions:
  - create the new model as dependent while inheriting the source role
  - remove selected rows from source and add them to the new model in source order
  - add and mark configured primary keys
  - create a data:relationship with multiplicity 1:1
constraints:
  - The new model depends on the source for identity, meaning, and lifecycle.
  - Unselected source fields and unrelated relationships are unchanged.
```

related:
  - requirement:model-refinement-patterns
  - data:relationship
  - data:dependent-entity

## data:extract-optional-model-pattern

Extract selected optional information into a model related as exactly one source to zero-or-one extracted model.

```yaml
description: Separate fields that may be absent as one optional group.
preconditions:
  context: ui:field-list-dialog
  selected_rows_minimum: 1
inputs:
  - new_model_name
  - requirement:model-refinement-patterns.shared_key_input
actions:
  - create the new model as dependent while inheriting the source role
  - remove selected rows from source and add them to the new model in source order
  - add and mark configured primary keys
  - create a data:relationship with source multiplicity 1 and new-model multiplicity 0..1
constraints:
  - The new model depends on the source for meaning and lifecycle.
  - Unselected source fields and unrelated relationships are unchanged.
```

related:
  - requirement:model-refinement-patterns
  - data:relationship
  - data:dependent-entity

## data:model-transformation

Model transformation is an intentional operation that changes model shape while preserving design meaning.

```yaml
fields:
  - intent
  - pattern
  - source_model
  - target_model
  - preserved_semantics
  - generated_physical_artifacts
  - decision
operations:
  - field_to_one_to_many
  - extract_dependent_entity
  - split_entity
  - extract_reference
  - create_snapshot
  - inherit_parent_attributes
  - apply data:extract-master-pattern
  - apply data:extract-domain-pattern
  - apply data:create-history-pattern
  - apply data:multiple-items-pattern
  - apply data:extract-optional-model-pattern
  - apply data:extract-one-to-one-pattern
  - apply data:split-by-code-set-pattern
  - apply data:create-work-pattern
example:
  operation: field_to_one_to_many
  intent: Need multiple values for one field.
  before: Order.product_name
  after:
    parent: Order
    child: OrderItem
    relationship: 1:N dependent
  preserved_semantics:
    - data:dependent-entity
    - data:relationship
    - requirement:design-decision-history
related:
  - requirement:normalization-support
  - data:dependent-entity
  - data:design-pattern
```

## data:multiple-items-pattern

Turn selected single-valued fields into a separately modeled 1:N or N:M collection.

```yaml
description: Allow multiple occurrences of selected fields.
preconditions:
  context: ui:field-list-dialog
  selected_rows_minimum: 1
inputs:
  - extracted_model_name
  - requirement:model-refinement-patterns.shared_key_input
  - cardinality
  - has_order
  - order_field_name_when_has_order
cardinality_values:
  - 1:N
  - N:M
actions:
  - create a dependent model inheriting the source role
  - remove selected rows from source and add them to the new model in source order
  - add and mark the configured primary keys
  - when ordered add the named order attribute
  - connect source and new model with the selected cardinality
constraints:
  - The new model depends on the source for meaning, ownership, and lifecycle.
  - order field name is required only when has_order is true.
  - New key and order names must not collide with moved fields.
  - Unselected source fields and unrelated relationships are unchanged.
```

related:
  - requirement:model-refinement-patterns
  - data:entity
  - data:relationship
  - data:dependent-entity

## data:split-by-code-set-pattern

Create one model per code-set entry when each status or kind needs a different model.

```yaml
description: Split a model into variants selected by code-set values.
preconditions:
  context: ui:field-list-dialog
  selected_code_set_attributes_minimum: 1
  every_selected_attribute_has: data:code-set
inputs:
  - inherit_parent
  model_name_by_code_set_entry:
    preset: code_set_entry_name + current_model_name
actions:
  - create one model for every entry of every selected code set
  - inherit source independence/dependence and role
  - keep selected code-set key attributes on the source parent
  - copy every relationship incident to source for each new model with equivalent direction, type, multiplicity, flags, and visibility
relationship_mode:
  inherit_parent_true:
    relationship:
      kind: inherit
      direction: child_to_source_parent
    attribute_projection: rule:inherit-attribute-projection
    card_display: show inherited parent attributes on each child
    child_owned_field_copy: none
  inherit_parent_false:
    relationship:
      kind: foreign_key
      direction: child_to_source_parent
      multiplicity: "1:1"
    attribute_projection: none
    child_owned_field_copy: all non-selected source fields
constraints:
  - Generated model names are editable before apply and unique.
  - The source model remains unchanged.
  - Empty code sets disable the pattern and report that entries are missing.
  - inherit_parent selects exactly one relationship mode and defaults to false.
  - Inherited attributes remain parent-owned and are not duplicated as child-owned logical attributes.
```

related:
  - requirement:model-refinement-patterns
  - data:code-set
  - data:relationship
  - rule:inherit-attribute-projection

## requirement:design-decision-history

All model changes are recorded as design decisions.

```yaml
captured_for:
  - entity_creation
  - attribute_change
  - attribute_move
  - model_transformation
  - normalization_operation
  - relationship_change
  - lifecycle_change
  - storage_projection_change
fields:
  - target
  - change_type
  - before
  - after
  - reason
  - author
  - timestamp
example:
  change: Split Order into Order and OrderLine
  reason: One order can contain multiple products.
operation_example:
  operation: data:model-transformation
  pattern: Child Entity
  intent: Need multiple values for one field.
  before: Order.product_name
  after: Order has many OrderItem
  preserved_semantics:
    - data:dependent-entity
    - ownership
    - lifecycle_dependency
related:
  - concept:model-growth
  - requirement:normalization-support
  - data:model-transformation
```

## requirement:field-list-management

Users manage a model seed's fields without leaving the canvas.

```yaml
requirements:
  entry_point:
    location: model_card_top_right
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

## requirement:normalization-support

Normalization is managed as an explicit design operation, not only as a diagram change.

```yaml
operations:
  - move_attribute
  - field_to_one_to_many
  - split_entity
  - extract_dependent_entity
  - extract_master
  - introduce_detail_entity
decision_capture:
  required: true
  target: requirement:design-decision-history
example:
  before:
    Order:
      - customer_name
      - product_name
  after:
    - Order
    - Customer
    - Product
one_to_many_example:
  intent: Need multiple values for one field.
  before:
    Order:
      - product_name
  after:
    Order:
      relationship: has many OrderItem
    OrderItem:
      role: dependent_entity
      attributes:
        - product_name
  preserve_semantics:
    - dependent_entity_role
    - ownership
    - lifecycle_dependency
    - transformation_intent
related:
  - data:model-transformation
  - data:dependent-entity
```

## ui:model-refinement-panel

The field-list side panel switches between domain selection and refinement patterns without hiding unavailable patterns.

```yaml
ui:
  root:
    kind: panel
    id: field-list-side-panel
    children:
      - kind: tabs
        id: field-list-tools
        children:
          - kind: tab
            id: domains
            target: ui:domain-dictionary-panel
          - kind: tab
            id: refinement-patterns
            target: pattern-list
      - kind: pattern-list
        id: model-refinement-patterns
        visibility: all_patterns_always
        item:
          fields:
            - title
            - description
            - availability
          enabled_action: open_pattern_input
          disabled_action: none
          disabled_reason:
            interaction:
              - pointer_hover
              - keyboard_focus
            content: all_missing_preconditions
      - kind: pattern-input
        state: selected_pattern
        children:
          - pattern_specific_form
          - transformation_preview
          - apply
          - cancel
availability:
  recompute_on:
    - field_selection_change
    - selected_model_change
    - attribute_or_relationship_change
  field_patterns:
    common_requirement: at_least_one_selected_row
  model_patterns:
    common_requirement: exactly_one_selected_model
accessibility:
  - Disabled reasons are available without pointer hover.
  - Disabled items expose disabled state and reason to assistive technology.
  - Tab and pattern selection are keyboard operable.
constraints:
  - A disabled pattern remains visible and cannot open or apply.
  - Missing-precondition text names every corrective action, not only the first failure.
  - Relationship-reference rows count only where a pattern explicitly permits them.
  - ui:domain-dictionary-panel behavior is unchanged.
```

related:
  - requirement:model-refinement-patterns
  - ui:field-list-dialog
  - ui:domain-dictionary-panel
  - data:relationship-reference

## Review Checklist

- [ ] Scope is correct.
- [ ] Missing references are resolved.
- [ ] Policies and permissions are explicit.
- [ ] Generated output is not written back as source.
