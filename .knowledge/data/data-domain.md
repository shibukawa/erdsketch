---
id: data:data-domain
type: data
title: Data Domain
---

Data domain is a named reusable semantic type assigned consistently across models.

```yaml
naming:
  vocabulary: data:vocabulary-binding
  display: requirement:name-display-switching
examples:
  user_id:
    definition_state: defined
    category: single_field
    primitive_type: varchar
    parameters:
      length: 6
  customer:
    definition_state: defined
    category: multi_field
    components:
      - tenant_id
      - user_code
definition_state:
  unresolved:
    primitive_type: undefined
    components: []
    assignable: true
  defined:
    assignable: true
category:
  built_in_primitive:
    source: data:primitive-type
  unresolved: {}
  single_field:
    components: 1
  multi_field:
    components: many
component: data:domain-component
base_type: data:primitive-type
constraints:
  - A domain name identifies one stable semantic type.
  - Quick creation produces definition_state unresolved; it never assumes varchar or another type.
  - A defined single-field domain resolves to data:primitive-type.
  - A defined multi-field component resolves to a defined single-field data:data-domain.
  - All attributes assigned the same domain share its type definition.
  - Composite domains are one logical field in editing surfaces.
  - Assignment never depends on definition state or component count.
  - Definition completeness is validated only when a physical artifact requires expansion.
  - Domain definition changes propagate to every assignment.
related:
  - data:attribute
  - requirement:domain-dictionary-management
  - rule:domain-expansion
  - rule:domain-key-projection
```
