---
id: rule:dfd-rough-rendering
type: rule
title: DFD Rough Rendering
---

DFD uses Rough.js for the same hand-drawn visual language as ERD while preserving each standard symbol.

```yaml
renderer: roughjs
applies_to:
  - node_outer_paths
  - node_internal_boundary_paths
  - data_flow_paths
  - overlap_group_boundaries
roughness:
  model:
    source: data:model-seed
    state: data:model-state
    invariant: equal_to_same_model_on_erd
  non_model_node: 1.0
  connector: 1.0
stroke:
  width: consistent_per_shape
  closed_shape: complete_outer_path
  selected_state: separate_highlight_not_replacement_outline
shapes:
  model:
    geometry: vertical_cylinder
    outer_path: closed
    internal_boundaries:
      - top_elliptical_face_seam
      - bottom_curved_surface_seam
  queue:
    geometry: horizontal_cylinder
    outer_path: closed
    internal_boundaries:
      - end_cap_curved_seam
  file:
    geometry: folded_corner_document
    outer_path: closed
    internal_boundaries:
      - folded_corner_crease
  external:
    geometry: pentagon
    outer_path: closed
    required_segments:
      - top
      - upper_diagonal
      - lower_diagonal
      - bottom
      - left
  process:
    geometry: flowchart_predefined_process
    outer_path: closed_rectangle
    internal_boundaries:
      - inner_left_vertical_line
      - inner_right_vertical_line
    variant_indicator:
      values:
        - batch
        - ui
      affects_outer_geometry: false
constraints:
  - CSS clipping must not remove or visually thin any required edge.
  - Internal cylinder seams use the same Rough.js coordinate system and compatible stroke weight as the outer path.
  - Text and semantic icons remain readable and are not converted to rough paths.
  - Roughness changes on a shared model are visible in both ui:erd-sketch-canvas and ui:dfd-sketch-canvas.
  - Rough rendering does not change hit areas, connector anchors, or rule:dfd-flow-routing.
  - Process side-boundary lines use the same Rough.js stroke character and weight as the outer rectangle.
```
