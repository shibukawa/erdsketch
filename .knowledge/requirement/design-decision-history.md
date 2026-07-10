---
id: requirement:design-decision-history
type: requirement
title: Design Decision History
---

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
