---
id: rule:domain-expansion
type: rule
title: Domain Expansion
---

A domain assignment remains one logical field while producing one physical field per component.

```yaml
input:
  logical_field_name: Customer
  domain: CustomerCode
  components:
    - TenantId
    - UserCode
output:
  physical_fields:
    - CustomerTenantId
    - CustomerUserCode
naming:
  default: concatenate_logical_name_and_component_name
  order: domain_component_order
scalar_domain:
  output_count: 1
  output_name: logical_field_name
composite_domain:
  editing_row_count: 1
  output_count: component_count
  assignable_when_empty_or_unresolved: true
physical_generation:
  complete_scalar: generate_one_column
  complete_composite: generate_component_columns
  unresolved_or_empty_composite: report_incomplete_physical_definition
constraints:
  - Expansion is derived and does not replace the logical attribute record.
  - Every generated field retains its source domain and component identity.
  - Name conflicts must be reported before physical model export.
  - Physical-generation failure never invalidates the logical assignment.
  - Key constraints project through rule:domain-key-projection.
```
