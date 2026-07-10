---
id: data:value-object
type: data
title: Value Object
---

Value object is a reusable structured concept that can be embedded in entities and expanded into physical columns later.

```yaml
examples:
  - Address
  - Money
  - Period
  - PersonName
  - PhoneNumber
usage_examples:
  - entity: Order
    attributes:
      - shippingAddress: Address
      - billingAddress: Address
physical_mapping:
  timing: later
  strategy: expand_to_columns_or_owned_structure
related:
  - data:data-domain
  - requirement:normalization-support
  - concept:design-pattern-catalog
```
