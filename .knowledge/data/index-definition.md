---
id: data:index-definition
type: data
title: Index Definition
---

Index definition stores one ordered physical access path for a projected SQL table.

```yaml
fields:
  - id
  - name
  - unique
  - keys
key:
  column_reference:
    source:
      - data:attribute
      - data:relationship-reference
    component_id: optional_for_composite_domain
  direction:
    values:
      - ascending
      - descending
    default: ascending
cardinality:
  keys: one_or_more
semantics:
  key_order: significant
  same_column_in_multiple_indexes: allowed
  duplicate_column_within_one_index: forbidden
  single_key: simple_index
  multiple_keys: composite_index
  unique: physical_unique_index
constraints:
  - Every key resolves to one projected physical column.
  - Index names are unique within one projected SQL namespace.
  - Expression, partial, covering/include, operator-class, and method-specific indexes are deferred.
related:
  - ui:index-definition-dialog
  - requirement:performance-design
  - requirement:sql-table-definition
  - rule:domain-expansion
```
