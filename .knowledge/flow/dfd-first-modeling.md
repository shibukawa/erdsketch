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
      action: select batch or UI in ui:modeling-quick-create, enter a name, and press Enter
    - id: identify-business-data
      action: create or search data:model-catalog and place it on ui:dfd-sketch-canvas
    - id: identify-external-entities
      action: select external in ui:modeling-quick-create, enter a name, and press Enter
    - id: connect-processes
      action: drag ui:diagram-link-handle and connect processes through file or queue data:dfd-intermediate-data
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
  invariants:
    - Existing SQL and schemas are inputs, not the starting point.
    - Starting from DFD or ERD is equally supported by requirement:dfd-modeling-experience.
related:
  - data:data-flow
  - concept:model-growth
```
