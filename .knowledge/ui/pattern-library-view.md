---
id: ui:pattern-library-view
type: ui
title: Pattern Library View
---

Users browse, search, and apply modeling patterns from the shared pattern catalog.

```yaml
ui:
  root:
    kind: view
    id: pattern-library-view
    children:
      - kind: search
        target: concept:design-pattern-catalog
      - kind: intent-filter
        target: concept:intent-based-navigation
      - kind: pattern-list
        item: data:design-pattern
      - kind: pattern-detail
        fields:
          - intent
          - problem
          - solution
          - advantages
          - disadvantages
          - when_to_use
          - when_not_to_use
          - alternatives
      - kind: apply-action
        action: record requirement:design-decision-history
```
