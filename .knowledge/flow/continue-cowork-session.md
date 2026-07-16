---
id: flow:continue-cowork-session
type: flow
title: Continue Co-work Session
---

```yaml
flow:
  trigger: actor:session-host reopens Co-work or selects Invite another collaborator while at least one peer is connected.
  preconditions:
    - The host retains the last valid ICE profile, access mode, and invitation label.
  steps:
    - id: bypass
      action: Open ui:share-work-dialog directly on its invitation step without showing connection configuration.
    - id: create
      action: Run flow:create-share-work-invitation with retained configuration and a new RTCPeerConnection and invitation ID.
    - id: answer
      action: Complete flow:complete-manual-webrtc-signaling independently for the new peer.
    - id: synchronize
      action: Send the current host snapshot to the newly connected participant while existing peers remain connected.
  constraints:
    - A WebRTC peer connection consumes at most one answer.
    - A logical Co-work session owns many peer-specific invitation-answer exchanges.
```
