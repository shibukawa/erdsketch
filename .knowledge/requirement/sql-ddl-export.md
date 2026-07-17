---
id: requirement:sql-ddl-export
type: requirement
title: Multi-Dialect SQL DDL Export
---

Users validate physical models and export target-specific DDL.

```yaml
targets:
  required:
    - mysql
    - postgresql
    - sqlite
    - duckdb
    - bigquery
selection:
  dialects:
    multiple: true
    at_least_one: true
  models:
    default: all physical models
validation:
  rule: rule:sql-export-readiness
  timing:
    - before generation
    - after returning from a diagnostic jump
  errors:
    presentation: ui:export-dialog.validation_results
    block_generation: true
  warnings:
    require_visibility: true
    block_generation: false
generation:
  source:
    - data:sql-table-projection
    - requirement:sql-table-definition
  output:
    one_file_per_dialect: true
    extension: .sql
    deterministic: true
  ordering:
    - schemas or datasets
    - tables
    - primary and unique constraints
    - indexes
    - deferred relationship constraints when target supports them
  target_behavior:
    unsupported_feature: diagnostic
    silent_omission: forbidden
    identifier_quoting: dialect_specific
    data_types: dialect_specific
acceptance:
  - Missing physical names or domain assignments produce blocking diagnostics.
  - Every diagnostic identifies a correction target and supports jump_to_source.
  - Composition and relationship path contradictions block export.
  - Successful output is syntactically valid for each selected target dialect.
  - Repeating export from the same snapshot and options produces byte-stable DDL except declared timestamp metadata.
```
