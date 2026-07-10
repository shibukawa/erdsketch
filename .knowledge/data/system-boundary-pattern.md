---
id: data:system-boundary-pattern
type: data
title: System Boundary Pattern
---

System boundary pattern records how responsibilities and data ownership are separated across systems.

```yaml
patterns:
  - Single Schema
  - Schema per Subsystem
  - Database per System
  - Shared Database
  - Service-owned Database
example_systems:
  - Order System
  - Inventory System
  - Shipping System
  - Billing System
decisions:
  - owner_system
  - schema_boundary
  - database_boundary
  - integration_method
related:
  - flow:dfd-first-modeling
  - data:data-ownership
```
