---
id: data:canvas-annotation
type: data
title: Canvas Annotation
---

Canvas annotation is one persistent, canvas-local visual discussion object independent from modeling definitions.

```yaml
fields:
  - id
  - canvas_type
  - canvas_id
  - kind
  - geometry
  - style
  - content
  - anchors
  - layer
  - z_index
  - created_by
  - created_at
  - updated_by
  - updated_at
kind:
  values:
    - sticky_note
    - arrow
    - freehand_stroke
    - background_boundary
content:
  sticky_note: text
  arrow: optional_label
  freehand_stroke: none
  background_boundary: optional_label
anchors:
  arrow_endpoint:
    values:
      - canvas_point
      - canvas_item_reference
layer:
  background_boundary: behind_modeling_items
  freehand_stroke: annotation_layer
  arrow: annotation_layer
  sticky_note: annotation_foreground
z_index:
  scope: within_layer
ownership:
  scope: containing_canvas
constraints:
  - References to canvas items are stable identifiers, not copied geometry.
  - Removing an attached canvas item detaches the endpoint at its last visible position.
  - Deleting an annotation never deletes or modifies a referenced modeling item.
  - Background boundaries do not own geometrically enclosed items.
```
