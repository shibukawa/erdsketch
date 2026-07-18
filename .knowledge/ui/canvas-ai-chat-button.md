---
id: ui:canvas-ai-chat-button
type: ui
title: Canvas AI Chat Button
---

Canvas exposes the same personal AI chat entry at its upper-right while no dialog is open.

```yaml
ui:
  root:
    kind: icon-button
    id: canvas-ai-chat
    label: Ask AI about this canvas
    action: open_ui:ai-assistant-chat-window
    placement:
      region: canvas_viewport_overlay
      vertical: top
      horizontal: right
      alignment: same_right_edge_as_dialog_header_actions
      coordinate_space: viewport
    visibility:
      no_dialog_open: visible
      dialog_open: hidden_and_inert
    unavailable_provider:
      enabled: false
      reason: visible_on_hover_focus_and_assistive_technology
integration:
  applies_to:
    - ui:erd-sketch-canvas
    - ui:dfd-sketch-canvas
  appearance: same_icon_size_and_label_pattern_as_ui:dialog-ai-chat-button
  context:
    - canvas_id
    - selected_model_ids
    - selected_attribute_ids
    - selected_process_or_flow_ids
responsive:
  keep_at_viewport_top_right: true
  never_move_with_pan_or_zoom: true
  avoid_safe_area_and_scrollbars: true
accessibility:
  - Icon has a persistent accessible name and visible focus state.
  - Button precedes canvas content controls in overlay keyboard order.
  - Hidden background entry is removed from keyboard and accessibility navigation while a dialog is open.
constraints:
  - Placement is relative to the canvas viewport, never world coordinates.
  - ui:canvas-floating-controls remain at bottom-right and do not merge with this entry.
  - Opening chat preserves canvas selection, viewport, and unsaved interaction state.
  - Context is not sent until the user submits a chat message.
  - With no selection, context uses the current canvas scope rather than every project canvas.
```
