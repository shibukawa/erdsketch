---
id: requirement:capacity-estimation
type: requirement
title: Capacity Estimation
---

Users estimate future record counts and storage from field sizes, model role, growth, retention, and indexes.

```yaml
inputs:
  field_size: data:field-size-estimate
  model_volume: data:volume-estimate
  lifecycle: data:data-lifecycle
  indexes: data:index-definition
calculation:
  record_count: rule:record-count-estimation
  storage_size: rule:storage-size-estimation
outputs:
  - estimated_record_count_by_horizon
  - estimated_record_payload_bytes
  - estimated_record_size_bytes
  - estimated_table_bytes
  - estimated_index_bytes
  - estimated_total_storage_bytes
quality:
  label: estimate
  show_assumptions: required
  unknown_input_behavior: partial_result_with_warning
  silent_zero_for_unknown_size: forbidden
acceptance:
  - Variable-width fields accept estimated average byte sizes.
  - Master models estimate growth from initial count and net increase rate.
  - Transaction models estimate retained rows from insert rate and retention.
  - Transaction retention is required, defaults to three years, and cannot be unlimited.
  - Each transaction model stores and edits its own retention period.
  - Users compare multiple projection horizons.
  - Record, table, index, and total storage estimates remain distinguishable.
  - Index storage includes explicit indexes plus implicit primary-key and UNIQUE structures.
  - Every result identifies missing inputs and approximation assumptions.
  - Expired transaction rows and every downstream destination are outside estimated storage.
related:
  - ui:volume-view
  - requirement:performance-design
```
