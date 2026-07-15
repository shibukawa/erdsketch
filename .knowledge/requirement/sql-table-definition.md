---
id: requirement:sql-table-definition
type: requirement
title: SQL Table Definition
---

Users define portable SQL table semantics before target-specific DDL export.

```yaml
column_scope:
  required:
    false: nullable
    true: not_null
    primary_key_effect: not_null
  unique:
    scope: single_projected_column
    primary_key_redundancy: do_not_emit_duplicate_constraint
  default: data:column-default
  generation: data:value-generation
table_scope:
  primary_key_order: rule:primary-key-column-order
  indexes: data:index-definition
  partitioning: data:partition-scheme
  additional_sql: data:ddl-extension-text
foreign_key_scope:
  referenced_key: target_primary_key_only
  composite_target_primary_key: supported
  deletion_action: data:referential-action
excluded_initially:
  - check_constraint_modeling
  - expression_index
  - partial_index
  - foreign_key_to_non_primary_composite_candidate_key
  - on_update_action
  - trigger
  - sequence_tuning
acceptance:
  - Required attributes export as NOT NULL; primary-key columns are always NOT NULL.
  - Unique exports a single-column unique constraint unless the primary key already provides it.
  - Defaults are structured and type-checked before export.
  - Auto increment is explicit and never inferred from integer primary-key membership.
  - Composite primary-key order follows persisted field-list order.
  - Composite indexes and range partitions are first-class definitions.
  - Unsupported dialect-specific clauses may be appended through data:ddl-extension-text.
  - DDL export reports unsupported target features instead of silently omitting them.
related:
  - data:sql-table-projection
  - data:attribute
  - data:relationship
  - requirement:performance-design
  - data:concept-projection
```
