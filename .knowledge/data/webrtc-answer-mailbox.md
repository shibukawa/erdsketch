---
id: data:webrtc-answer-mailbox
type: data
title: WebRTC Answer Mailbox
---

WebRTC answer mailbox is transient same-origin localStorage used only to notify a live host tab that an answer URL was opened elsewhere.

```yaml
v1:
  key: erdsketch.share-work.answer.v1.<session_id>
  value:
    t: answer_data:share-work-token
    c: created_at_epoch_milliseconds
    p: random_answer_page_id
  producer: flow:relay-webrtc-answer
  consumer: live_host_tab_waiting_in_ui:share-work-dialog
  notification: Window_storage_event
lifecycle:
  - Answer page writes only after token validation.
  - Host validates the token against its in-memory pending invitation before applying it.
  - Host removes the entry after successful consumption; removal acknowledges delivery to the answer page.
  - Any page removes entries older than 10 minutes during startup cleanup.
constraints:
  - Mailbox never stores SDP outside the answer token or stores project data, TURN credentials, or RTCPeerConnection state.
  - Mailbox delivery works only across same-origin browsing contexts.
  - localStorage failure falls back to pasting the answer URL into the original host dialog.
```
