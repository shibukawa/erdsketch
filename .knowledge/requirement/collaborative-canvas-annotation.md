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
    output: freehand_stroke
    closed_stroke_action: convert_to_background_boundary
  boundary:
    purpose: visually_label_subsystem_or_discussion_scope
    label: optional
collaboration:
  rule: rule:canvas-annotation-collaboration
semantics:
  rule: rule:canvas-annotation-semantics
acceptance:
  - Two users on the same canvas see annotation creation, editing, movement, and deletion without reload.
  - Users see live collaborator cursors, selections, and text-edit ownership on the active canvas.
  - Attached arrow endpoints follow moved canvas items.
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
