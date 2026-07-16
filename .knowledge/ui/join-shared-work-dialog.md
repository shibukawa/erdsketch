---
id: ui:join-shared-work-dialog
type: ui
title: Join Co-work Dialog
---

```yaml
ui:
  root:
    kind: dialog
    id: join-shared-work
    title: Join Co-work
    state:
      - preparing_answer
      - answer_ready
      - waiting_for_host
      - connected
      - failed
    children:
      - kind: status
        id: requested-access
      - kind: status
        id: invitation-label
        visible_when: label_present
      - kind: output
        id: answer-url
        visible_when: answer_ready_or_waiting_for_host
        actions:
          - copy
          - navigator_share_when_available
      - kind: instruction
        id: return-answer
        text: Send this answer URL back to the host through chat or another channel.
      - kind: status
        id: connection-status
      - kind: notice
        id: host-disconnect-message
        visible_when: session_closing_received
constraints:
  - The answer URL uses '#as=' and contains one answer data:share-work-token.
  - The participant page remains open until RTCDataChannel connects or setup is cancelled.
  - Closing or reloading the participant page before connection invalidates the answer.
```
