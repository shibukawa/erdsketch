---
id: rule:domain-key-projection
type: rule
title: Domain Key Projection
---

Logical key flags project across physical columns produced by rule:domain-expansion.

```yaml
primary_key:
  scalar_domain: one_primary_key_column
  composite_domain: ordered_composite_primary_key
foreign_key:
  scalar_domain: one_foreign_key_column
  composite_domain: ordered_composite_foreign_key
source_of_truth:
  key_flag: logical_attribute_or_relationship_reference
  physical_constraints: derived
column_order: domain_component_order
foreign_key_compatibility:
  - component_count_equal
  - component_order_corresponds
  - component_types_compatible
incomplete_domain:
  logical_assignment: preserved
  physical_generation: validation_error
constraints:
  - Physical key columns are not stored as independent logical attributes.
  - Every projected column retains source attribute, domain, and component identity.
  - Composite key projection does not change one-row logical display.
```
