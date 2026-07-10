---
id: data:data-domain
type: data
title: Data Domain
---

Data domain is a single-value semantic type above primitive data types.

```yaml
examples:
  - EmailAddress
  - PostalCode
  - Currency
  - EmployeeNumber
hierarchy:
  - primitive_type
  - data:data-domain
  - data:value-object
  - data:entity
constraints:
  - Do not treat all strings as equivalent.
  - Domain validation can be reused across entities.
related:
  - data:attribute
  - data:value-object
```
