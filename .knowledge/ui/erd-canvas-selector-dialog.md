---
id: ui:erd-canvas-selector-dialog
type: ui
title: ERD Canvas Selector Dialog
---

Users navigate project canvases and see current collaboration presence.

```yaml
ui:
  root:
    kind: dialog
    id: erd-canvas-selector
    title: ERD Canvases
    children:
      - kind: list
        id: erd-canvas-list
        source: data:project
        item_fields:
          - canvas_name
          - active_state
        item_action: open_canvas
      - kind: list
        id: online-project-users
        state: currently_online
        item_fields:
          - display_name
          - avatar
      - kind: button
        label: Create canvas
        action: create_erd_canvas
constraints:
  - Opening the dialog does not leave the current canvas until another canvas is selected.
  - The current canvas is distinguishable in the list.
  - Presence is live collaboration state, not persisted canvas membership.
  - ui:workspace-data-navigation places project management before this canvas-level control.
```
