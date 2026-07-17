---
id: flow:annotation-geometry-editing
type: flow
title: Annotation Geometry Editing
---
Selected annotations expose geometry editing appropriate to their complexity on ui:canvas-annotation-toolbar.

```yaml
flow:
  branches:
    arrow:
      - select arrow
      - show start and end handles immediately
      - drag either endpoint
      - pointerup commits one geometry update
    freehand_stroke:
      - select annotation
      - press Edit
      - show stroke nodes
      - move nodes or delete one selected stroke
      - press Confirm to commit one geometry update
    background_boundary:
      - select annotation
      - press Edit
      - show boundary vertex nodes
      - move or delete selected vertices while at least 3 remain
      - press Confirm to commit one geometry update
  deletion:
    normal: delete complete data:canvas-annotation
    freehand_edit: delete only selected stroke
    final_freehand_stroke: delete complete annotation
  rule: rule:canvas-annotation-collaboration
```
