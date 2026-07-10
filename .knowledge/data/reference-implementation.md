---
id: data:reference-implementation
type: data
title: Reference Implementation
---

Reference implementation records how external or master data is referenced without assuming foreign keys.

```yaml
patterns:
  - Foreign Key Reference
  - Reference API
  - Local Replica
  - Event-synchronized Copy
  - CDC Replica
  - Transaction Snapshot
  - Periodic Snapshot
  - Manual Import
  - Denormalized Copy
fields:
  - referenced_data
  - reference_method
  - consistency_model
  - freshness
  - failure_mode
  - audit_requirement
related:
  - data:master-data-distribution
  - data:snapshot-reference
  - data:concept-projection
```
