---
id: ui:storage-view
type: ui
title: Storage View
---

Users manage projections to OLTP, OLAP, search, archive, and other storage targets.

```yaml
ui:
  root:
    kind: view
    id: storage-view
    children:
      - kind: projection-editor
        item: data:concept-projection
      - kind: storage-target-list
        item: system:storage-target
```
