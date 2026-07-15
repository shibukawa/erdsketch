---
id: ui:canvas-annotation-toolbar
type: ui
title: Canvas Annotation Toolbar
---

The annotation toolbar exposes fast Miro-like discussion tools on ERD and DFD canvases.

```yaml
ui:
  root:
    kind: toolbar
    id: canvas-annotation-toolbar
    children:
      - kind: tool
        id: select
        action: select_or_move_annotation
      - kind: tool
        id: sticky-note
        action: place_and_edit_sticky_note
      - kind: tool
        id: arrow
        action: draw_or_attach_annotation_arrow
      - kind: tool
        id: pen
        action: draw_freehand_stroke
      - kind: tool
        id: boundary
        action: draw_background_boundary
      - kind: toggle
        id: annotation-visibility
        action: show_or_hide_annotations
    contextual_actions:
      closed_freehand_stroke:
        - convert_to_background_boundary
      selected_annotation:
        - edit_style
        - duplicate
        - delete
        - move_forward_within_allowed_layer
        - move_backward_within_allowed_layer
    keyboard:
      escape: return_to_select
      delete: delete_selected_annotation
      undo: undo_own_latest_canvas_operation
      redo: redo_own_latest_undone_canvas_operation
constraints:
  - One active drawing tool is visually distinguishable.
  - Selecting a drawing tool does not disable canvas pan or zoom gestures.
  - Touch and pen input do not require hover-only controls.
  - Sticky-note text editing starts immediately after placement.
  - Color choices meet text and focus-indicator contrast requirements.
```
