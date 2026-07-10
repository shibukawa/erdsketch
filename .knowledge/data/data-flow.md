---
id: data:data-flow
type: data
title: Data Flow
---

Data flow records where data is generated, where it moves, and where it is used.

```yaml
fields:
  - source
  - destination
  - data
  - trigger
  - transformation
  - transaction_boundary
  - system_boundary
  - owner
  - synchronization_method
  - freshness
  - consumer
purposes:
  - represent_data_architecture
  - expose_transaction_boundaries
  - expose_business_responsibilities
  - expose_system_boundaries
  - expose_data_ownership
  - connect_erd_dwh_and_event_driven_architecture
  - support_lineage_and_governance_extensions
related:
  - event:data-change-event
  - system:storage-target
  - data:concept-projection
  - data:system-boundary-pattern
  - data:data-ownership
  - flow:dfd-first-modeling
```
