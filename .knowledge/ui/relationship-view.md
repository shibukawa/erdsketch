---
id: ui:relationship-view
type: ui
title: Relationship View
---

Users edit semantic relationship types and relationship metadata.

```yaml
ui:
  root:
    kind: view
    id: relationship-view
    children:
      - kind: relationship-editor
        item: data:relationship
        editable_types:
          - has-a
          - is-a
          - Composition
          - Aggregation
          - dependent
        editable_semantics:
          - ownership
          - lifecycle_dependency
          - delete_behavior
          - identity_scope
```
