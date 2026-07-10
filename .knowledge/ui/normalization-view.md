---
id: ui:normalization-view
type: ui
title: Normalization View
---

Users normalize by dragging attributes and splitting entities.

```yaml
ui:
  root:
    kind: view
    id: normalization-view
    children:
      - kind: entity-board
        item: data:entity
      - kind: draggable-attribute-list
        item: data:attribute
        actions:
          - move_attribute
          - field_to_one_to_many
          - split_entity
          - extract_dependent_entity
          - record_decision
related:
  - requirement:normalization-support
  - data:model-transformation
  - ui:transformation-view
```
