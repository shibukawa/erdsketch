---
id: data:ddl-extension-text
type: data
title: DDL Extension Text
---

DDL extension text appends user-authored target-specific SQL after generated table artifacts.

```yaml
scope: one_SQL_table_projection_and_export_target
fields:
  - text
  - target
placement: after_generated_table_indexes_and_partitions
semantics:
  generated_verbatim: true
  parsed_as_portable_model: false
  used_for:
    - deferred_check_constraints
    - target_specific_table_options
    - unsupported_advanced_index_clauses
constraints:
  - Empty text has no output effect.
  - Extension text never changes the structured model silently.
  - Export visibly separates generated DDL from extension text.
```
