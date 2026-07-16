---
id: ui:cowork-disconnection-dialog
type: ui
title: Co-work Disconnection Dialog
---

```yaml
ui:
  root:
    kind: dialog
    id: cowork-disconnected
    title: Co-work connection lost
    state:
      - snapshot_available
      - snapshot_unavailable
      - host_ended_session
    children:
      - kind: status
        id: disconnect-reason
      - kind: status
        id: last-snapshot-time
      - kind: warning
        id: no-reconnect
        text: Collaborative editing has stopped. A new invitation is required to reconnect.
      - kind: button
        label: View read-only snapshot
        action: flow:recover-disconnected-cowork-participant.view_snapshot
        visible_when: snapshot_available
      - kind: button
        label: Close
        action: flow:recover-disconnected-cowork-participant.close
constraints:
  - This dialog has priority over workspace-start, project selection, and join dialogs.
  - State that the snapshot is another person's model and cannot continue as an independently editable project.
  - After snapshot viewing starts, keep a visible read-only status in the workspace.
```
