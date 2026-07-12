---
id: data:create-work-pattern
type: data
title: Create Work Pattern
---

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
