---
id: ui:canvas-floating-controls
type: ui
title: Canvas Floating Controls
---

```yaml
ui:
  root:
    kind: floating_controls
    id: canvas-floating-controls
    placement: bottom_right
    children:
      - kind: icon_button
        action: reset_view
      - kind: icon_button
        action: zoom_out
      - kind: status
        value: zoom_percent
      - kind: icon_button
        action: zoom_in
      - kind: icon_button
        action: open_tips
order:
  viewport_controls: left_of_tips
applies_to:
  - ui:erd-sketch-canvas
  - ui:dfd-sketch-canvas
constraints:
  - Controls remain reachable without consuming ui:workspace-header width.
  - Icon buttons have accessible names and visible focus states.
```
