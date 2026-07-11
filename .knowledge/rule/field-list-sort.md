---
id: rule:field-list-sort
type: rule
title: Field List Sort
---

The combined field-list projection uses key semantics for deterministic grouping after save.

```yaml
trigger: successful_save_commit
applies_to:
  - data:attribute
  - data:relationship-reference
rank:
  - condition: primary_key_is_true
    group: primary_key
  - condition: primary_key_is_false_and_foreign_key_is_true
    group: foreign_key
  - condition: otherwise
    group: other
precedence:
  - primary_key
  - foreign_key
  - other
behavior:
  before_commit: preserve_current_editor_order
  after_commit: show_ranked_projection
  stored_cross_type_order: false
  tie_order: stable_existing_order
constraints:
  - A primary-key and foreign-key reference belongs to the primary-key group.
  - Sorting changes presentation only and never moves records between persistence collections.
related:
  - requirement:field-list-management
  - data:attribute
  - data:relationship-reference
  - ui:field-list-dialog
```
