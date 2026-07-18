---
id: flow:place-existing-model-on-canvas
type: flow
title: Place Existing Model on Canvas
---

```yaml
flow:
  trigger: User requests an existing model while editing ui:erd-sketch-canvas.
  steps:
    - id: browse
      action: Search or browse data:model-catalog.
    - id: select
      action: Select a model not yet placed on the current canvas.
    - id: authorize
      action: Apply rule:canvas-model-ownership; use owner when the model has no ERD placement, otherwise readonly.
    - id: place
      action: Create data:canvas-model-placement at the chosen position.
    - id: render
      action: Render the shared model and show readonly when applicable.
  failure:
    already_placed: Focus the existing placement instead of creating a duplicate.
  recovery:
    unplaced_catalog_model: First ERD placement becomes owner so later ownership transfer is possible.
```
