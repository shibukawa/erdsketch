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
  - name: vocabulary
    type: data:vocabulary-binding
    optional: true
  - name: data_type
    type: text
    optional: true
  - name: domain
    type: data:data-domain
    optional: true
  - name: required
    type: boolean
  - name: unique
    type: boolean
    default: false
  - name: default
    type: data:column-default
    optional: true
  - name: value_generation
    type: data:value-generation
    optional: true
  - name: size_estimates
    type: data:field-size-estimate
    optional: true
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
  - When domain is assigned, its definition is authoritative over an independently entered data_type.
  - Composite domain assignment remains one logical attribute and expands through rule:domain-expansion.
  - Domain shape does not change the attribute count in logical editing or model-card display.
  - A key flag belongs to the logical attribute and projects to physical columns through rule:domain-key-projection.
  - Attribute records and data:relationship-reference records use separate collections and persistence schemas.
  - Attribute never stores a relationship reference discriminator or relationship ID.
  - important has no SQL or schema-generation semantics.
  - primary_key implies important according to rule:primary-key-favorite.
  - primary_key implies required for physical SQL projection.
  - unique describes one logical attribute; composite uniqueness uses data:index-definition.
  - Auto increment is explicit data:value-generation and is never inferred from primary_key.
  - Estimated average size affects capacity estimation only and never changes the domain or DDL type.
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
  - data:relationship-reference
  - data:data-domain
  - rule:domain-expansion
  - rule:domain-key-projection
  - requirement:sql-table-definition
  - data:field-size-estimate
```
