---
id: data:relationship
type: data
title: Relationship
---

Relationship is a semantic association between entities, not only an ER line.

```yaml
relationship_types:
  - has-a
  - is-a
  - Aggregation
  - Composition
  - dependent
common_fields:
  - name
  - source_entity
  - target_entity
  - cardinality
  - description
  - semantic_role
has_a_fields:
  - lifecycle
  - ownership
  - cascade
dependent_fields:
  - parent_entity
  - child_entity
  - existence_dependency
  - owner
  - delete_behavior
  - ordering
  - identity_scope
is_a_fields:
  - inheritance_mapping
inheritance_mapping_values:
  - Single Table
  - Class Table
  - Concrete Table
examples:
  - source: Order
    type: has-a
    target: OrderLine
  - source: Customer
    type: is-a
    target: CorporateCustomer
  - source: Order
    type: Composition
    target: OrderLine
  - source: Order
    type: dependent
    target: OrderItem
    meaning: OrderItem exists only as part of Order.
  - source: Department
    type: Aggregation
    target: Employee
related:
  - term:relationship-vocabulary
  - ui:relationship-view
  - data:dependent-entity
```
