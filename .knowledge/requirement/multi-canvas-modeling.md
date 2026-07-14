---
id: requirement:multi-canvas-modeling
type: requirement
title: Multi-Canvas Modeling
---

Users organize one data model project across multiple ERD canvases without duplicating model definitions.

```yaml
requirements:
  canvas:
    owner: data:project
    cardinality_per_project: many
    identity:
      - id
      - name
    lifecycle:
      - create
      - rename
      - select
      - open
  shared_scope:
    model_catalog: data:model-catalog
    vocabulary: requirement:vocabulary-management
    domain_dictionary: requirement:domain-dictionary-management
  reuse:
    source: data:model-catalog
    target: ui:erd-sketch-canvas
    flow: flow:place-existing-model-on-canvas
  placement:
    definition: data:canvas-model-placement
    ownership_rule: rule:canvas-model-ownership
  navigation:
    surface: ui:erd-canvas-selector-dialog
  inventory:
    surface: ui:model-catalog-view
    shows:
      - owner_canvas
      - placed_canvases
      - placement_access_mode
  ownership_transfer:
    entry_points:
      - ui:model-catalog-view
    dialog: ui:canvas-ownership-transfer-dialog
    flow: flow:transfer-canvas-model-ownership
acceptance:
  - A project can contain more than one ERD canvas.
  - Adding or removing a model placement does not duplicate or delete the shared model definition.
  - A model already used on one canvas can be selected from data:model-catalog and placed on another canvas.
  - Every canvas uses the same project model catalog, vocabulary, and domain dictionary.
  - A model definition change is visible in every placement of that model.
  - A readonly placement rejects model-definition edits from that canvas.
  - The canvas selector shows the project ERD canvases and currently online project users.
  - The model catalog view shows every model's owner canvas separately from all canvases where it appears.
  - Users can open a listed canvas and locate the selected model placement.
  - Users can transfer an exclusively owned model to another canvas from the model catalog.
  - Ownership transfer makes the target placement owner and the previous owner placement readonly as one atomic change.
open_decisions:
  - Whether master model placements are writable on every canvas or use an explicit editing authority.
  - How ownership is represented for an explicitly shared boundary or work model.
  - Whether the online-user list is global to the project or grouped by active canvas.
```
