---
id: requirement:dfd-modeling-experience
type: requirement
title: Compact DFD Modeling Experience
---

Users may begin project development from DFD or ERD and reuse the first-created models when adding the other view.

```yaml
requirements:
  entry:
    choices:
      - ui:dfd-sketch-canvas
      - ui:erd-sketch-canvas
    preferred_choice: none
  multi_sheet:
    owner: data:project
    canvas: data:dfd-canvas
    lifecycle:
      - create
      - rename
      - select
      - open
  shared_models:
    source: data:model-catalog
    dfd_placement: data:dfd-node-placement
    erd_placement: data:canvas-model-placement
    behavior:
      - Creating a model from DFD registers one project model definition.
      - Creating a model from ERD registers one project model definition.
      - The later canvas searches the catalog and places the existing definition.
      - Placement never copies the model definition.
  dfd_nodes:
    - data:dfd-process
    - data:model-catalog
    - data:dfd-external-entity
    - data:dfd-intermediate-data
  aligned_interactions:
    creation: ui:modeling-quick-create
    connection: ui:diagram-link-handle
  focus:
    - fast_capture
    - search_then_place
    - minimal_node_metadata
acceptance:
  - One project can contain multiple DFD canvases.
  - A user can start from either DFD or ERD without a migration step.
  - A model created first in either view is searchable and placeable in the other.
  - A model definition change is visible in its ERD and DFD placements.
  - Repeated node creation uses one persistent name input and Enter instead of one dialog per node.
  - DFD creation type is selected by one of six radio options: batch, UI, model, file, queue, or external.
  - Batch/UI and file/queue variants remain editable after creation.
  - Adding physical processes changes a process presentation without creating a distinct logical-process node.
  - ERD and DFD connections start by dragging the selected item's bottom-right link handle.
  - A flow connected to a model displays CRUD only at its model endpoint as defined by rule:dfd-model-crud-label.
  - Detailed process-unit/model CRUD values use data:crud-assignment and render as a union on the canvas.
  - A one-way right-to-left flow is valid and does not require bidirectional state.
  - DFD node outlines, internal shape boundaries, connectors, and group boundaries follow rule:dfd-rough-rendering.
  - Queue and model shapes include curved-surface boundary lines that make their cylinder geometry legible.
  - Every process, including batch, UI, and physical-process-list presentation, uses a rectangle with doubled left and right vertical sides.
  - External-entity diagonal edges and file-fold edges are complete and use the same apparent stroke weight as other edges.
  - Selecting a DFD model exposes the ERD hamburger field action and opens ui:field-list-dialog.
  - Field edits made from DFD update the shared model definition and appear in ERD.
  - Direct process-to-process and data-entity-to-data-entity flows cannot remain on the diagram.
  - Users can compress repeated process-to-data-entity lines with data:dfd-overlap-group.
  - Intermediate data can be compressed into one dashed data-entity group.
  - The same external entity can be placed multiple times on one DFD canvas.
  - External entities can exchange data with processes, models, and intermediate data.
  - DFD guidance follows ui:dfd-daily-tips and validation follows requirement:dfd-validation.
```
