---
id: data:extract-optional-model-pattern
type: data
title: Extract Optional Model Pattern
---

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
