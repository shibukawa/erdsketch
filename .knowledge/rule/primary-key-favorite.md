---
id: rule:primary-key-favorite
type: rule
title: Primary Key Is Favorite
---

Every primary-key attribute is automatically a favorite attribute.

```yaml
invariant:
  expression: primary_key_implies_important
  effective_important: important OR primary_key
transitions:
  set_primary_key_true:
    set_important: true
  set_important_false_while_primary_key_true:
    result: important_remains_effectively_true
  set_primary_key_false:
    important: preserve_current_value
semantics:
  primary_key: schema_identity
  important: canvas_display_priority_only
related:
  - data:attribute
  - requirement:field-list-management
  - requirement:model-card-field-summary
```
