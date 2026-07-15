---
id: data:concept-projection
type: data
title: Concept Projection
---

A single concept can be projected to multiple storage targets.

```yaml
fields:
  - source_concept
  - storage_target
  - physical_name
  - system_of_record_role
  - synchronization_method
  - freshness
  - sql_table_projection
system_of_record_roles:
  - SoR
  - Derived
synchronization_methods:
  - CDC
  - ETL
  - Streaming
  - Manual
freshness_values:
  - Real Time
  - 1 min
  - 15 min
  - Daily
example:
  source_concept: Order
  projections:
    - target: PostgreSQL
      physical_name: orders
      role: SoR
    - target: BigQuery
      physical_name: fact_orders
      role: Derived
    - target: OpenSearch
      physical_name: order_document
      role: Derived
    - target: S3
      physical_name: archive
      role: Derived
sql_target_detail: data:sql-table-projection
related:
  - system:storage-target
  - ui:storage-view
  - data:sql-table-projection
```
