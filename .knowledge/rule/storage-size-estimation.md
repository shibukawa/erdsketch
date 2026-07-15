---
id: rule:storage-size-estimation
type: rule
title: Storage Size Estimation
---

Storage size estimation converts projected column sizes and row counts into table and index capacity estimates.

```yaml
inputs:
  - data:field-size-estimate
  - data:volume-estimate
  - data:index-definition
  - storage_overhead_profile
record:
  payload_bytes: sum_of_effective_average_projected_column_bytes
  estimated_size_bytes: payload_bytes_plus_target_or_generic_row_overhead
table:
  estimated_bytes: estimated_record_count * estimated_record_size_bytes
index:
  structures:
    - explicit_indexes
    - primary_key_index
    - single_column_unique_indexes
  entry_payload_bytes: sum_of_index_key_average_bytes
  entry_size_bytes: entry_payload_bytes_plus_pointer_and_index_overhead
  estimated_bytes: estimated_record_count * entry_size_bytes
total:
  estimated_bytes: estimated_table_bytes + sum_of_estimated_index_bytes
generic_overhead_profile:
  row_overhead_ratio: 0.20
  index_overhead_ratio: 0.20
  index_pointer_bytes: 8
display_units:
  - B
  - KiB
  - MiB
  - GiB
  - TiB
excluded:
  - transaction_log
  - replication
  - backup
  - temporary_space
  - free_space_and_bloat
  - engine_specific_external_value_storage
  - expired_transaction_rows
  - downstream_storage_destinations
constraints:
  - Logical payload and overhead-adjusted storage are displayed separately.
  - Unknown field size produces an incomplete estimate and names the field.
  - Target-specific profiles override generic overhead without changing source inputs.
  - Primary-key and UNIQUE index structures are included even when no explicit index is configured.
```
