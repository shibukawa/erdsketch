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
  - name: placements
    type: list
    item: data:dfd-node-placement
  - name: flows
    type: list
    item: data:data-flow
  - name: overlap_groups
    type: list
    item: data:dfd-overlap-group
constraints:
  - A project may own multiple DFD canvases.
  - A DFD canvas does not own a separate domain dictionary or vocabulary.
  - A DFD canvas uses the project data:model-catalog.
  - Placement stores canvas-local position and routing; reusable definitions remain project-scoped.
```
