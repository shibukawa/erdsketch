---
id: requirement:collaborative-canvas-annotation
type: requirement
title: Collaborative Canvas Annotation
---

Users discuss architecture directly on modeling canvases with shared visual annotations without changing model semantics.

```yaml
scope:
  canvases:
    - ui:erd-sketch-canvas
    - ui:dfd-sketch-canvas
  surface: ui:canvas-annotation-toolbar
  record: data:canvas-annotation
tools:
  sticky_note:
    content: short_rich_text
    resize: true
    colors: small_accessible_palette
  arrow:
    endpoints:
      - free_canvas_point
      - attached_canvas_item
    label: optional
  pen:
    output: one freehand_stroke annotation containing one or more strokes
    creation: flow:multi-stroke-annotation-drawing
    closed_stroke_action: convert_to_background_boundary
  boundary:
    purpose: visually_label_subsystem_or_discussion_scope
    label: optional
geometry_editing:
  flow: flow:annotation-geometry-editing
  arrow: direct_endpoint_drag_on_selection
  freehand_stroke: explicit_edit_mode_with_node_and_stroke_deletion
  background_boundary: explicit_edit_mode_with_node_movement_and_deletion
geometry_efficiency:
  requirement: requirement:annotation-point-simplification
collaboration:
  rule: rule:canvas-annotation-collaboration
semantics:
  rule: rule:canvas-annotation-semantics
acceptance:
  - Two users on the same canvas see annotation creation, editing, movement, and deletion without reload.
  - Users see live collaborator cursors, selections, and text-edit ownership on the active canvas.
  - Annotation text follows rule:collaborative-text-commit so host snapshots cannot overwrite unfinished typing.
  - Attached arrow endpoints follow moved canvas items.
  - Releasing the pointer ends one pen stroke but keeps the drawing session active for more strokes.
  - Done commits all strokes from the active pen session as one annotation.
  - Normal deletion removes the complete multi-stroke annotation.
  - Geometry edit can remove one stroke without removing its sibling strokes.
  - Freehand and boundary geometry changes commit only when Confirm is pressed.
  - Selected arrow endpoints can be dragged without entering geometry edit.
  - Completed pen strokes and boundaries discard redundant points without visible shape loss.
  - A closed pen stroke can become a background boundary without moving enclosed items.
  - Annotations persist with their canvas and reopen at the same geometry and layer.
  - Annotation operations participate in per-user undo and redo.
  - Exported or captured canvas output includes visible annotations.
  - Hiding annotations does not delete them or alter model content.
non_goals:
  - infer_model_relationships_from_annotation_arrows
  - infer_ownership_or_membership_from_visual_enclosure
  - replace_structured_model_or_dfd_editing
open_decisions:
  - Whether an explicit action later promotes an annotation arrow into a model relationship or DFD flow.
  - Whether a background boundary can later become a semantic subsystem with explicit membership.
  - Whether annotation visibility can be filtered by author or discussion thread.
```
