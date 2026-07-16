---
id: flow:disconnect-cowork-session
type: flow
title: Disconnect Co-work Session
---

```yaml
flow:
  trigger: actor:session-host selects Disconnect all in ui:share-work-dialog.
  steps:
    - id: validate_message
      action: Normalize optional text and limit it to 120 Unicode characters.
    - id: notify
      action: Best-effort send data:collaboration-message session_closing to every open peer.
    - id: close
      action: Close all pending and connected RTCPeerConnection and RTCDataChannel instances.
    - id: reset
      action: Clear peer count, pending invitations, and active Co-work UI state while retaining reusable connection configuration.
    - id: present
      actor: actor:session-participant
      action: Display the received message or a default host-ended-session notice.
  failure:
    notify_failed: Close every transport anyway.
```
