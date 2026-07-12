---
id: data:extract-master-pattern
type: data
title: Extract New Master Pattern
---

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

