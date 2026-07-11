---
id: data:domain-component
type: data
title: Domain Component
---

Domain component is one ordered member of a structured data:data-domain.

```yaml
fields:
  - name
  - type_reference
  - required
  - description
type_reference:
  initial: undefined
  optional: true
  allowed:
    - data:primitive-type
    - scalar_data_domain
constraints:
  - Component names are unique within a domain.
  - Quick entry creates a component name with undefined type_reference.
  - Undefined type_reference is valid during logical editing and assignment.
  - Component order is stable and controls expansion order.
  - Component order also controls composite key column order through rule:domain-key-projection.
  - Composite domain nesting is excluded until recursive expansion rules are designed.
example:
  domain: CustomerCode
  components:
    - name: TenantId
      type_reference: TenantId
    - name: UserCode
      type_reference: UserCode
```
