---
id: ui:cowork-participant-tooltip
type: ui
title: Co-work Participant Tooltip
---

```yaml
ui:
  root:
    kind: tooltip
    id: cowork-participants
    trigger:
      - cowork_button_hover_or_focus
      - participant_initials_hover_or_focus
    children:
      - kind: status
        id: participant-count
      - kind: list
        id: all-participants
        item_fields:
          - color_initial
          - display_name
          - self_marker
          - host_marker_when_known
          - connection_status
constraints:
  - Include the local user and every remote participant; avatar truncation affects only the header summary.
  - Use the same surface in ERD and DFD workspace headers.
  - Keep the tooltip open while its trigger or list is hovered or keyboard-focused.
```
