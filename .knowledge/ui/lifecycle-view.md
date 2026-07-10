---
id: ui:lifecycle-view
type: ui
title: Lifecycle View
---

Users edit retention, state transitions, and deletion rules.

```yaml
ui:
  root:
    kind: view
    id: lifecycle-view
    children:
      - kind: lifecycle-form
        item: data:data-lifecycle
      - kind: state-transition-editor
        item: data:state-transition
      - kind: deletion-policy-editor
        item: policy:deletion-policy
```
