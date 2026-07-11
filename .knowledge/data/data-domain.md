---
id: data:data-domain
type: data
title: Data Domain
---

Data domain is a named reusable semantic type assigned consistently across models.

```yaml
examples:
  user_id:
    shape: scalar
    primitive: varchar
    length: 6
  customer:
    shape: composite
    components:
      - tenant_id
      - user_code
shape:
  scalar:
    components: 1
  composite:
    components: many
component: data:domain-component
base_type: data:primitive-type
constraints:
  - A domain name identifies one stable semantic type.
  - Every component resolves to a primitive type or another scalar data:data-domain.
  - All attributes assigned the same domain share its type definition.
  - Composite domains are one logical field in editing surfaces.
  - Domain definition changes propagate to every assignment.
related:
  - data:attribute
  - requirement:domain-dictionary-management
  - rule:domain-expansion
```
