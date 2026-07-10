---
id: data:dependent-entity
type: data
title: Dependent Entity
---

Dependent entity is a child entity whose meaning depends on a parent entity.

SQL tables and foreign keys cannot fully preserve this semantic role, so the tool keeps it explicitly.

```yaml
fields:
  - parent_entity
  - child_entity
  - cardinality
  - ownership
  - lifecycle_dependency
  - existence_dependency
  - delete_behavior
  - ordering
  - identity_scope
typical_patterns:
  - Child Entity
  - Detail Table
  - Composition
  - Owned Collection
example:
  parent: Order
  child: OrderItem
  meaning: OrderItem exists only inside Order.
sql_information_loss:
  - dependent_role
  - ownership_intent
  - lifecycle_dependency
  - transformation_intent
related:
  - data:relationship
  - data:model-transformation
```
