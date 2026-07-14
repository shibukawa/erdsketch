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
  - label
  - protocol
  - trigger
  - transformation
  - transaction_boundary
  - system_boundary
  - owner
  - synchronization_method
  - freshness
  - consumer
  - crud_assignments
purposes:
  - represent_data_architecture
  - expose_transaction_boundaries
  - expose_business_responsibilities
  - expose_system_boundaries
  - expose_data_ownership
  - connect_erd_dwh_and_event_driven_architecture
  - support_lineage_and_governance_extensions
canvas: data:dfd-canvas
rendering: rule:dfd-flow-routing
topology: rule:dfd-connection-policy
semantics: rule:dfd-flow-semantics
compressed_representation: rule:dfd-group-flow-expansion
model_endpoint_labels: rule:dfd-model-crud-label
crud_detail: data:crud-assignment
related:
  - event:data-change-event
  - system:storage-target
  - data:concept-projection
  - data:system-boundary-pattern
  - data:data-ownership
  - flow:dfd-first-modeling
```
