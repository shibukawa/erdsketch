---
id: rule:primary-key-column-order
type: rule
title: Primary Key Column Order
---

Composite primary-key column order is derived from user-authored field-list order.

```yaml
source_order:
  surface: ui:field-list-dialog
  interaction: drag
  persisted_scope: primary_key_rows_across_attributes_and_relationship_references
projection:
  first: primary_key_row_order
  within_composite_domain: domain_component_order
constraints:
  - Primary-key grouping never discards user-authored order within the group.
  - Changing primary-key membership preserves the remaining rows' relative order.
  - No separate numeric key-order input is required.
related:
  - rule:field-list-sort
  - rule:domain-key-projection
  - data:attribute
  - data:relationship-reference
```
