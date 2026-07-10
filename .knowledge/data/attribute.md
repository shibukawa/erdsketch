---
id: data:attribute
type: data
title: Attribute
---

Attribute is an editable property of data:entity.

```yaml
fields:
  - name: name
    type: text
  - name: data_type
    type: text
  - name: required
    type: boolean
  - name: unique
    type: boolean
  - name: description
    type: text
operations:
  - add
  - remove
  - edit
  - move_to_another_entity
normalization_support:
  example:
    from: Order.product_name
    to: Product.name
  records_decision: requirement:design-decision-history
```
