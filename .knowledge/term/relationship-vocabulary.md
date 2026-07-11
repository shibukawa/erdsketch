---
id: term:relationship-vocabulary
type: term
title: Relationship Vocabulary
---

Relationships have one business-readable name and an independently selected reading direction.

```yaml
examples:
  - name: ownership
    direction: parent_to_child
  - name: dependency
    direction: dependent_to_independent
rules:
  name_count: one
  direction_follows_meaning: true
  direction_is_not_derived_from_cardinality: true
related:
  - data:relationship
  - term:vocabulary
```
