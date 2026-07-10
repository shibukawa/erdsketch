---
id: flow:dfd-first-modeling
type: flow
title: DFD First Modeling
---

DFD-first modeling starts from business processes and data flows instead of existing UI, APIs, SQL, or schemas.

```yaml
flow:
  trigger: Start a new modeling session.
  steps:
    - id: identify-business-process
      action: describe business process
    - id: identify-business-data
      action: identify data crossing process boundaries
    - id: identify-transaction-boundaries
      action: expose transaction boundaries and responsibilities
    - id: identify-system-boundaries
      action: apply data:system-boundary-pattern
    - id: derive-concepts
      action: create business concepts and entity candidates
    - id: choose-patterns
      action: use concept:intent-based-navigation and concept:design-pattern-catalog
    - id: transform-model
      action: apply data:model-transformation
    - id: produce-physical-model
      action: produce physical model and DDL
  example_sequence:
    - Order Reception
    - Order
    - Inventory Allocation
    - Shipment
    - Billing
  invariant: Existing SQL and ERD are inputs, not the starting point.
related:
  - data:data-flow
  - concept:model-growth
```
