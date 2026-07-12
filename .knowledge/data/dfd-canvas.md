---
id: data:dfd-canvas
type: data
title: DFD Canvas
---

DFD canvas is one named data-flow diagram owned by data:project.

```yaml
fields:
  - name: id
    type: identifier
  - name: name
    type: text
  - name: flows
    type: list
    item: data:data-flow
constraints:
  - A project may own multiple DFD canvases.
  - A DFD canvas does not own a separate domain dictionary or vocabulary.
```
