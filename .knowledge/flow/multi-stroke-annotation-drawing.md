---
id: flow:multi-stroke-annotation-drawing
type: flow
title: Multi-Stroke Annotation Drawing
---
The pen tool collects multiple pointer strokes into one data:canvas-annotation before committing it.

```yaml
flow:
  trigger: select pen in ui:canvas-annotation-toolbar
  steps:
    - id: begin-stroke
      action: pointer drag starts a local point sequence
    - id: finish-stroke
      action: pointerup simplifies and appends the sequence to the local annotation draft
      requirement: requirement:annotation-point-simplification
    - id: offer-completion
      action: show red Done button after the first valid stroke
    - id: continue
      action: another pointer drag appends another stroke to the same draft
      repeat: begin-stroke
    - id: complete
      action: Done commits one freehand_stroke annotation containing every draft stroke
      rule: rule:canvas-annotation-collaboration
  constraints:
    - Pointerup does not commit or leave the pen drawing session.
    - Done is unavailable until at least one valid stroke exists.
    - One completion is one undoable annotation creation.
```
