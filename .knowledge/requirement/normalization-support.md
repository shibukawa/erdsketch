---
id: requirement:normalization-support
type: requirement
title: Normalization Support
---

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
