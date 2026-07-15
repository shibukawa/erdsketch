---
id: data:volume-estimate
type: data
title: Volume Estimate
---

Volume estimate stores role-specific record-growth inputs and derived capacity results for one model.

```yaml
common_inputs:
  - initial_record_count
  - projection_horizons
  - maximum_record_count
role_profiles:
  master:
    growth: data:growth-rate
    meaning: net_record_increase
  transaction:
    growth: data:growth-rate
    meaning: expected_insert_count
    retention: data:data-lifecycle.retention_period
    retention_required: true
    retention_default: 3_years
    unlimited_retention: forbidden
    retention_scope: current_model
derived:
  record_count: rule:record-count-estimation
  storage_size: rule:storage-size-estimation
  fields:
    - estimated_record_count_by_horizon
    - estimated_record_payload_bytes
    - estimated_record_size_bytes
    - estimated_table_bytes
    - estimated_index_bytes
    - estimated_total_storage_bytes
relationship_propagation:
  example:
    relationship: Order 1:N OrderLine
    average_children: 3
    maximum_children: 100
constraints:
  - Retention is read from the current model's data:data-lifecycle and is not duplicated as an independent value.
  - Every transaction model may override the three-year default independently.
  - Transaction estimates cover retained transaction data only; expired rows and downstream storage are out of scope.
  - Derived values are recomputed when fields, indexes, role, rate, retention, horizon, or overhead profile changes.
related:
  - data:relationship
  - requirement:performance-design
  - requirement:capacity-estimation
  - ui:volume-view
```
