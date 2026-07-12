---
id: data:extract-one-to-one-pattern
type: data
title: Extract Model One-to-One Pattern
---

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
