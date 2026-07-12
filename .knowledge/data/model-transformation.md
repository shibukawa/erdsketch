---
id: data:model-transformation
type: data
title: Model Transformation
---

Model transformation is an intentional operation that changes model shape while preserving design meaning.

```yaml
fields:
  - intent
  - pattern
  - source_model
  - target_model
  - preserved_semantics
  - generated_physical_artifacts
  - decision
operations:
  - field_to_one_to_many
  - extract_dependent_entity
  - split_entity
  - extract_reference
  - create_snapshot
  - inherit_parent_attributes
example:
  operation: field_to_one_to_many
  intent: Need multiple values for one field.
  before: Order.product_name
  after:
    parent: Order
    child: OrderItem
    relationship: 1:N dependent
  preserved_semantics:
    - data:dependent-entity
    - data:relationship
    - requirement:design-decision-history
related:
  - requirement:normalization-support
  - data:dependent-entity
  - data:design-pattern
```
