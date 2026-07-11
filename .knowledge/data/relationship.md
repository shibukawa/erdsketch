---
id: data:relationship
type: data
title: Relationship
---

Relationship is a first-class semantic association between models, not a SQL table or foreign-key primitive.

```yaml
relationship_types:
  - has-a
  - is-a
  - Aggregation
  - Composition
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
  - cascade
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
inheritance_mapping_values:
  - Single Table
  - Class Table
  - Concrete Table
examples:
  - source: Order
    type: has-a
    target: OrderLine
  - source: Customer
    type: is-a
    target: CorporateCustomer
  - source: Order
    type: Composition
    target: OrderLine
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
```
