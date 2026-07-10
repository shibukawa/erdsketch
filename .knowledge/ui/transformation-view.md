---
id: ui:transformation-view
type: ui
title: Transformation View
---

Users apply intent-preserving model transformations such as turning a repeated field into a 1:N dependent entity.

```yaml
ui:
  root:
    kind: view
    id: transformation-view
    children:
      - kind: intent-picker
        target: concept:intent-based-navigation
      - kind: pattern-suggestions
        target: concept:pattern-discovery
      - kind: transformation-preview
        item: data:model-transformation
      - kind: semantic-preservation-panel
        fields:
          - dependent_entity_role
          - ownership
          - lifecycle_dependency
          - transformation_intent
      - kind: apply-action
        action: record requirement:design-decision-history
```
