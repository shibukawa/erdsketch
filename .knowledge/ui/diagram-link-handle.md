---
id: ui:diagram-link-handle
type: ui
title: Diagram Link Handle
---

ERD and DFD use the same drag gesture to begin a connection from a selected item.

```yaml
ui:
  root:
    kind: link_handle
    id: selected-item-link-handle
    icon: link
    position: bottom_right
    visibility: selected_item_only
gesture:
  start: pointer_down_on_handle
  move: drag_connector_preview
  target: compatible_item
  finish: release_on_target
  cancel: release_on_empty_space_or_escape
feedback:
  - highlight_valid_targets
  - show_connector_preview
  - reject_invalid_target
applies_to:
  - ui:erd-sketch-canvas
  - ui:dfd-sketch-canvas
constraints:
  - Selecting a source does not require a separate Start connection button.
  - DFD target compatibility and automatic repair follow rule:dfd-connection-policy.
```
