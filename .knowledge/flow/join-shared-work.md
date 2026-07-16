---
id: flow:join-shared-work
type: flow
title: Join Co-work
---

```yaml
flow:
  trigger: Page startup detects '#iv=' containing an offer data:share-work-token.
  steps:
    - id: capture
      action: Copy the fragment token into memory and remove it from the visible URL with history.replaceState.
    - id: validate
      action: Decode and validate data:share-work-token under size limits before WebRTC API calls.
    - id: review
      action: Show the optional invitation label and requested access before acceptance.
    - id: configure
      action: Use policy:ice-server-configuration defaults or participant-selected custom ICE settings.
    - id: answer
      action: Create RTCPeerConnection, setRemoteDescription with the offer, createAnswer, setLocalDescription, and wait for ICE gathering complete.
    - id: return
      action: Append '#as=' and the answer token to the fragment-free current URL, then show it in ui:join-shared-work-dialog with copy and navigator.share actions.
    - id: connect
      action: Wait for actor:session-host to apply the answer and open RTCDataChannel.
    - id: join
      action: Send join with the session ID, receive permission:collaboration-session-access and the initial state snapshot, then enter flow:host-authoritative-collaboration.
    - id: checkpoint
      action: Persist data:cowork-participant-checkpoint after each accepted state_snapshot so reload recovery does not depend on the removed URL fragment.
  failure:
    invalid_or_unsupported_token: Show a safe error without echoing the token.
    answer_not_returned: Keep waiting while the page and peer connection remain alive.
    host_unavailable: Enter flow:recover-disconnected-cowork-participant with the last accepted host snapshot.
```
