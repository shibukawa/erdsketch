---
id: flow:create-share-work-invitation
type: flow
title: Create Co-work Invitation
---

```yaml
flow:
  trigger: actor:session-host confirms configuration in ui:share-work-dialog.
  preconditions:
    - A data:project is open and canonical in host frontend memory.
    - Browser supports requirement:webrtc-share-work compatibility requirements.
    - policy:ice-server-configuration is valid.
  steps:
    - id: reserve
      action: Create a random peer invitation ID and retain selected permission:collaboration-session-access, ICE profile, and optional 30-character label in page memory.
    - id: create_peer
      action: Create RTCPeerConnection and one ordered RTCDataChannel for data:collaboration-message.
    - id: offer
      action: createOffer, setLocalDescription, then wait for iceGatheringState complete.
    - id: encode
      action: Encode the complete localDescription as an offer data:share-work-token.
    - id: link
      action: Append '#iv=' and the token to the current URL without its existing fragment.
    - id: present
      action: Show copy and navigator.share actions and wait for flow:complete-manual-webrtc-signaling.
  postconditions:
    - The invitation is single-use and belongs to the current logical Co-work session.
    - Another participant requires flow:continue-cowork-session and a distinct RTCPeerConnection offer.
  failure:
    unsupported_browser: Explain the missing API and do not create a partial invitation.
    ice_gathering_failed: Keep project local and allow configuration retry.
    token_too_large: Do not emit a truncated URL; recommend signaling service support.
    dialog_closed_or_page_reloaded: Close the peer connection and invalidate the invitation.
```
