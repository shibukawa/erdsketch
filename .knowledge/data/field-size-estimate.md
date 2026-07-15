---
id: data:field-size-estimate
type: data
title: Field Average Size Estimate
---

Field size estimate records the estimated average size in encoded bytes of one projected variable-width column.

```yaml
fields:
  - column_reference
  - estimated_average_size_bytes
column_reference:
  source: data:attribute
  component_id: optional_for_composite_domain
eligibility:
  varchar: optional_override
  text: required_for_complete_capacity_estimate
  blob: required_for_complete_capacity_estimate
validation:
  - estimated_average_size_bytes is a nonnegative number.
  - A varchar estimate does not exceed its target-encoded maximum without a warning.
derivation:
  fixed_width_primitives: derive_from_effective_type_and_target_profile
  variable_width_without_estimate: unknown
constraints:
  - Missing size never becomes zero silently.
  - Units are bytes, not characters.
  - The estimate affects capacity calculations only and never changes DDL type or limits.
related:
  - rule:domain-expansion
  - rule:storage-size-estimation
```
