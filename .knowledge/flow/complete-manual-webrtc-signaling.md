---
id: flow:complete-manual-webrtc-signaling
type: flow
title: Complete Manual WebRTC Signaling
---

```yaml
flow:
  trigger: actor:session-host pastes an answer URL or token, or receives data:webrtc-answer-mailbox through a storage event from flow:relay-webrtc-answer.
  preconditions:
    - The original RTCPeerConnection is alive.
    - The token session ID matches exactly one unused pending invitation.
  steps:
    - id: validate
      action: Decode '#as=' or raw answer token and validate it without changing peer state.
    - id: apply
      action: Atomically consume the peer invitation and call setRemoteDescription with the answer SDP.
    - id: dismiss
      action: Close ui:share-work-dialog after setRemoteDescription succeeds without closing the connecting RTCPeerConnection.
    - id: open
      action: Wait for RTCDataChannel open and participant join.
    - id: authorize
      action: Bind the host-retained permission:collaboration-session-access to the connected peer.
    - id: synchronize
      action: Send the canonical project snapshot before accepting operation intents.
  failure:
    unknown_expired_or_used_session: Reject without exposing pending session identifiers.
    invalid_answer: Keep the pending invitation retryable until explicitly cancelled.
    connection_failed: Close the peer and require a new invitation.
```
