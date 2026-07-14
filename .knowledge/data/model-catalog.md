---
id: data:model-catalog
type: data
title: Project Model Catalog
---

Project model catalog is the shared identity and definition store for models reusable across ERD and DFD canvases.

```yaml
owner: data:project
cardinality_per_project: one
contains:
  - data:model-seed
  - data:entity
  - data:value-object
  - data:data-domain
view: ui:model-catalog-view
canvas_membership:
  source: data:canvas-model-placement
  derived_fields:
    - owner_canvas
    - placed_canvases
    - placement_count
constraints:
  - Model identity is project-scoped and independent of canvas placement.
  - Every canvas reads the same catalog.
  - A model definition exists once even when it has many data:canvas-model-placement records.
  - Creating a model on an ERD or DFD canvas registers it in this catalog.
  - DFD placement state is stored in data:dfd-node-placement, not in the model definition.
  - Model visibility across ERD and DFD follows rule:dfd-model-scope.
```
