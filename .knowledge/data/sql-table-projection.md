---
id: data:sql-table-projection
type: data
title: SQL Table Projection
---

SQL table projection stores one model's physical table design for one SQL target.

```yaml
fields:
  - id
  - source_model
  - storage_target
  - schema_name
  - table_name
  - column_projection
  - indexes
  - partitioning
  - additional_sql
column_projection:
  source: data:attribute
  portable_values:
    - required
    - unique
    - data:column-default
    - data:value-generation
  target_override: deferred
indexes: data:index-definition
partitioning: data:partition-scheme
additional_sql: data:ddl-extension-text
constraints:
  - storage_target identifies one SQL dialect or generic SQL.
  - Source model identity and projected physical names remain separate.
  - One source model may have multiple target projections.
related:
  - data:concept-projection
  - requirement:sql-table-definition
  - system:storage-target
```
