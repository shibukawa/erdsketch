---
id: data:value-generation
type: data
title: Value Generation
---

Value generation records whether a field receives a database-generated value.

```yaml
kinds:
  - none
  - auto_increment
default: none
auto_increment:
  eligibility:
    - primary_key
    - effective_primitive_type_integer
  explicit_selection: required
  dialect_projection:
    PostgreSQL: identity
    MySQL: auto_increment
    SQLite: integer_primary_key_rule
constraints:
  - Integer primary-key membership never enables auto increment implicitly.
  - Unsupported target mappings block export for the affected table.
  - UUID generation, named sequences, start values, increments, caches, and cycles are deferred.
```
