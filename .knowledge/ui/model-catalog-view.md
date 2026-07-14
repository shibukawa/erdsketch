---
id: ui:model-catalog-view
type: ui
title: Project Model Catalog View
---

Users browse every project model and inspect its canvas ownership and placements.

```yaml
ui:
  root:
    kind: view
    id: project-model-catalog
    title: Models
    source: data:model-catalog
    children:
      - kind: filters
        id: model-catalog-filters
        fields:
          - model_role
          - owner_canvas
          - placement_canvas
          - access_mode
      - kind: table
        id: project-model-list
        columns:
          - model_name
          - model_role
          - owner_canvas
          - placed_canvases
          - placement_count
        row_action: open_model_details
      - kind: detail
        id: model-canvas-membership
        fields:
          - owner_canvas
          - canvas_placements
        canvas_placement_fields:
          - canvas_name
          - access_mode
        actions:
          - open_owner_canvas
          - locate_canvas_placement
          - place_on_current_canvas
          - open_ownership_transfer_dialog
semantics:
  owner_canvas: Canvas holding primary responsibility under rule:canvas-model-ownership.
  placed_canvases: Canvases containing data:canvas-model-placement, including readonly appearances.
constraints:
  - Owner canvas and placed canvases are shown separately.
  - A readonly appearance is distinguishable from the owner placement.
  - Selecting a canvas placement can open that canvas and focus the model.
  - The list shows master and explicitly shared models even when no exclusive owner canvas exists.
```
