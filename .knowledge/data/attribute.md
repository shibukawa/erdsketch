---
id: data:attribute
type: data
title: Attribute
---

Attribute is an editable property of data:entity.

```yaml
fields:
  - name: id
    type: identifier
  - name: name
    type: text
  - name: data_type
    type: text
    optional: true
  - name: required
    type: boolean
  - name: unique
    type: boolean
  - name: primary_key
    type: boolean
    default: false
  - name: important
    type: boolean
    default: false
    semantic: visual_emphasis_only
  - name: description
    type: text
operations:
  - add
  - remove
  - edit
  - move_to_another_entity
constraints:
  - important has no SQL or schema-generation semantics.
  - primary_key implies important according to rule:primary-key-favorite.
  - important may be true without primary_key.
  - A primary-key attribute cannot have an effective important value of false.
  - Foreign-key assignment is outside field-list editing; data:relationship owns relationships.
normalization_support:
  example:
    from: Order.product_name
    to: Product.name
  records_decision: requirement:design-decision-history
related:
  - requirement:field-list-management
  - ui:field-list-dialog
  - rule:primary-key-favorite
```
