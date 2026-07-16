---
id: decision:manual-webrtc-signaling
type: decision
title: Manual WebRTC Signaling
---

V1 exchanges complete non-trickle ICE offer and answer descriptions through user-shared URL fragments instead of a signaling backend.

```yaml
decision:
  offer_path: host_to_participant_invitation_URL
  answer_path: participant_to_host_answer_URL
  fragment_keys:
    invitation: iv
    answer: as
  base_url: current_document_URL_without_existing_fragment
  ice_strategy: wait_for_iceGatheringState_complete_before_encoding
rationale:
  - WebRTC requires both an offer and an answer before the data connection can open.
  - URL fragments are not included in HTTP requests but remain visible to browser history, clipboard, and share targets.
  - Complete descriptions avoid a separate trickle ICE candidate channel.
constraints:
  - Host keeps the original RTCPeerConnection and pending invitation alive until the answer is applied.
  - Pending invitations expire after 10 minutes and are consumed after one successful answer.
  - Reloading either side before completion aborts setup.
  - A token is a bearer secret and must be hidden from logs, analytics, previews, and referrer-derived data.
  - Each page clears '#iv=' or '#as=' with history.replaceState after decoding it into memory.
answer_delivery:
  preferred: Open the answer URL in a separate same-origin tab or window while the original host tab remains alive.
  automatic: flow:relay-webrtc-answer uses data:webrtc-answer-mailbox to notify the original host tab.
  fallback: Paste the answer URL or token into the original waiting host dialog.
  forbidden:
    - replacing_or_reloading_the_original_host_tab
    - creating_a_replacement_RTCPeerConnection_in_the_answer_page
future:
  automatic_exchange: authenticated_ephemeral_signaling_service
```
