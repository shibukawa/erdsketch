---
id: data:multiple-items-pattern
type: data
title: Multiple Items Pattern
---

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
