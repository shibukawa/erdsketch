---
id: data:dfd-node-placement
type: data
title: DFD Node Placement
---

DFD node placement records one canvas-local appearance without copying a reusable definition.

```yaml
fields:
  - placement_id
  - canvas_id
  - node_type
  - node_id
  - position
node_type:
  values:
    - process
    - model
    - external_entity
    - intermediate_data
identity:
  primary: placement_id
  unique_definition_per_canvas:
    applies_to:
      - process
      - model
      - intermediate_data
    key:
      - canvas_id
      - node_type
      - node_id
  repeated_definition_per_canvas:
    applies_to:
      - external_entity
    key:
      - placement_id
constraints:
  - Model placement references data:model-catalog.
  - Model roughness and fields are derived from the shared model definition, not stored on this placement.
  - Position belongs to data:dfd-canvas.
  - Removing a model placement does not delete its project model definition.
  - Same-class overlap membership references data:dfd-overlap-group.
  - A process or data-entity definition appears at most once on one DFD canvas.
  - One data:dfd-external-entity definition may have multiple placements on one DFD canvas.
```
