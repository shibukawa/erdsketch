---
id: flow:recover-disconnected-cowork-participant
type: flow
title: Recover Disconnected Co-work Participant
---

```yaml
flow:
  trigger: A connected participant loses RTCDataChannel, or page startup finds an active participant marker without a live connection or invitation fragment.
  steps:
    - id: block_start
      action: Suppress normal workspace-start and project-selection dialogs.
    - id: load
      action: Validate data:cowork-participant-checkpoint and discard pending optimistic intents.
    - id: explain
      action: Present ui:cowork-disconnection-dialog before any other modal and state that collaborative editing cannot continue without a new invitation.
    - id: choose
      branches:
        view_snapshot:
          - Keep the last host-accepted snapshot as another person's model.
          - Detach collaboration transport and open the snapshot in read-only reference mode.
          - Block local mutations, project promotion, export-as-editable-copy, and host-role promotion.
        close:
          - Clear the participant checkpoint and attempt window.close.
          - If browser policy blocks close, replace the workspace with a safe closed-session screen.
        no_valid_snapshot:
          - Offer close only.
  constraints:
    - Do not silently open a blank or seed project after participant session loss.
    - Do not claim automatic reconnection; a fresh invitation is required.
    - A retained participant snapshot is reference material, not an independently editable local project.
```
