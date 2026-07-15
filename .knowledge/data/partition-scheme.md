---
id: data:partition-scheme
type: data
title: Partition Scheme
---

Partition scheme stores an ordered range-partition design for one projected SQL table.

```yaml
strategy: range
fields:
  - keys
  - ranges
key:
  column_reference:
    source: data:attribute
    component_id: optional_for_composite_domain
  order: significant
range:
  fields:
    - id
    - name
    - from
    - to
  bound_item:
    kinds:
      - literal
      - minvalue
      - maxvalue
  semantics:
    from: inclusive
    to: exclusive
validation:
  errors:
    - no_key
    - boundary_arity_mismatch
    - incompatible_boundary_type
    - from_not_less_than_to
    - overlapping_ranges
    - duplicate_partition_name
  warnings:
    - uncovered_range_gap
hint_integration:
  source: requirement:domain-partition-key-marking
  effect: preselect_candidate_keys_only
  force_partitioning: false
constraints:
  - Range partitioning is a first-class design element, not free-form SQL.
  - Target DDL projection reports unsupported multi-column or bound features.
  - List, hash, automatic interval creation, and default partitions are deferred.
related:
  - ui:partition-definition-dialog
  - requirement:performance-design
  - requirement:sql-table-definition
  - rule:domain-expansion
```
