---
id: data:relationship
type: data
title: Relationship
---

Relationship is a first-class semantic association between models. Its kind determines whether physical SQL projection creates a foreign key, expands inherited attributes, or has no effect.

```yaml
relationship_types:
  - foreign_key
  - inherit
  - label
  - has-a
  - is-a
  - Aggregation
  - composition
  - dependent
common_fields:
  - name
  - source_entity
  - target_entity
  - reading_direction
  - source_multiplicity
  - target_multiplicity
  - description
  - semantic_role
  - data:referential-action
multiplicity_values:
  - "0..1"
  - "1"
  - "0..*"
  - "1..*"
common_mappings:
  one_to_one: "1 / 1"
  optional_to_one: "0..1 / 1"
  one_to_many: "1 / 0..* or 1..*"
  many_to_one: "0..* or 1..* / 1"
  many_to_many: "0..* or 1..* / 0..* or 1..*"
semantics:
  representation: relationship_entity
  persists_independently_of_sql_projection: true
  name_example: ownership
  single_name: true
  reading_direction_values:
    - source_to_target
    - target_to_source
  direction_depends_on_meaning: true
  examples:
    ownership: parent_to_child
    dependency: dependent_to_independent
  relationship_flag_required: false
rendering:
  roughness: rule:relationship-roughness
export_projection:
  timing: code_export_only
  by_kind:
    foreign_key: existing_cardinality_based_projection
    inherit: rule:inherit-attribute-projection
    label: none
  one_to_many_or_many_to_one:
    relationship_name_becomes: foreign_key_reference_name
  many_to_many:
    relationship_name_becomes: join_table_name
  editor_representation_before_export: relationship_entity
reference_projection:
  visibility:
    one_to_many: many_endpoint
    many_to_one: many_endpoint
    one_to_one: arrow_origin_endpoint
    many_to_many: both_endpoints
    composition: owner_endpoint
  model_ownership: none
  cardinality_flip_effect: presentation_only
  persisted_as: data:relationship-reference
  stored_separately_from: data:attribute
  presentation:
    icon: chain
    label: relationship_name
  flags:
    primary_key: editable
    foreign_key: editable
    independence: independent_booleans
    allowed_combinations:
      - neither
      - primary_key_only
      - foreign_key_only
      - primary_key_and_foreign_key
  note: Relationship reference is separate persisted data presented beside attributes; it does not redefine the relationship as a SQL foreign key.
has_a_fields:
  - lifecycle
  - ownership
  - data:referential-action
composition:
  semantics: data:composition-relationship
  owner_endpoint: source_entity
  child_endpoint: target_entity
  name_becomes: owner_field_name
  reference_projection: owner_endpoint
dependent_fields:
  - parent_entity
  - child_entity
  - existence_dependency
  - owner
  - delete_behavior
  - ordering
  - identity_scope
is_a_fields:
  - inheritance_mapping
reference_kinds:
  foreign_key:
    sql_effect: foreign_key_or_join_table
    on_delete: data:referential-action
  inherit:
    direction: child_to_parent
    sql_effect: copy_all_parent_attributes_into_child_table
    projection: rule:inherit-attribute-projection
  label:
    sql_effect: none
    display: relationship_name_only
    multiplicity: none
    reading_direction: none
inheritance_mapping_values:
  - Single Table
  - Class Table
  - Concrete Table
examples:
  - source: Order
    type: has-a
    target: OrderLine
  - source: CorporateCustomer
    type: inherit
    target: Customer
    direction: child_to_parent
  - source: OrderHistory
    type: label
    target: Order
    name: history
  - source: Order
    type: composition
    target: OrderLine
    name: lines
  - source: Order
    type: dependent
    target: OrderItem
    meaning: OrderItem exists only as part of Order.
  - source: Department
    type: Aggregation
    target: Employee
related:
  - term:relationship-vocabulary
  - ui:relationship-view
  - data:dependent-entity
  - requirement:relationship-management
  - data:relationship-reference
  - requirement:relationship-validation
  - rule:relationship-roughness
  - rule:inherit-attribute-projection
  - data:referential-action
```
