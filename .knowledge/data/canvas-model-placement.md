---
id: data:canvas-model-placement
type: data
title: Canvas Model Placement
---

Canvas model placement records one appearance of a project model on one ERD canvas.

```yaml
fields:
  - canvas_id
  - model_id
  - position
  - access_mode
access_mode:
  values:
    - owner
    - readonly
  default_for_non_owning_canvas: readonly
identity:
  unique:
    - canvas_id
    - model_id
references:
  model: data:model-catalog
  canvas: ui:erd-sketch-canvas
constraints:
  - Placement stores view state, not a copied model definition.
  - The same model may have placements on multiple canvases.
  - Removing a placement does not remove the model from data:model-catalog.
  - An owner placement may initiate requirement:model-removal project deletion; a readonly placement may remove only itself.
  - readonly is visible on the model card.
```
