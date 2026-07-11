---
id: requirement:domain-partition-key-marking
type: requirement
title: Domain Partition Key Marking
---

Domain definitions may mark scalar values or individual composite components as partition keys.

```yaml
domain_editor:
  surface: ui:domain-dictionary-dialog
  control:
    kind: checkbox
    label: Partition key
    default: false
  placement:
    single_field_domain: domain_value
    multi_field_domain: each_data:domain-component_row
  multiplicity:
    multi_field_domain: zero_or_more_components
semantics:
  ownership: domain_definition
  propagation: every_data:attribute_assigned_to_domain
  independent_from:
    - primary_key
    - foreign_key
  schema_generation: partitioning_hint
projection:
  single_field_domain:
    marked_output: assigned_logical_attribute
  multi_field_domain:
    marked_output: each_expanded_field_whose_component_is_marked
    expansion: rule:domain-expansion
presentation:
  field_editor:
    marked_field:
      background: distinct_partition_key_style
  model_card:
    marked_field:
      icon: partition_key
      accessible_label: Partition key
  accessibility:
    color_only_indicator: forbidden
acceptance:
  - A single-field domain exposes one Partition key checkbox.
  - Every component of a multi-field domain exposes its own Partition key checkbox.
  - Multiple components in one multi-field domain may be marked.
  - Changing a domain partition-key flag updates every attribute assigned to that domain.
  - A marked scalar domain makes its assigned field a partition-key field.
  - A marked composite component marks only its corresponding expanded field.
  - Marked fields have a distinct background in field editing surfaces.
  - Marked fields have a partition-key icon on model cards.
  - The icon or accessible text identifies the state without relying on background color.
  - Partition-key state neither sets nor clears primary-key or foreign-key state.
related:
  - data:data-domain
  - data:domain-component
  - data:attribute
  - ui:domain-dictionary-dialog
  - ui:field-list-dialog
  - ui:erd-sketch-canvas
  - rule:domain-expansion
```
