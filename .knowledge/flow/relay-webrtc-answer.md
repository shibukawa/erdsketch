---
id: flow:relay-webrtc-answer
type: flow
title: Relay WebRTC Answer to Host Tab
---

```yaml
flow:
  trigger: Page startup detects '#as=' containing an answer data:share-work-token.
  steps:
    - id: capture
      action: Copy the answer token into memory and remove the fragment with history.replaceState.
    - id: validate
      action: Decode under limits, require answer kind, and obtain the session ID.
    - id: publish
      action: Write data:webrtc-answer-mailbox and wait for a live same-origin host tab to consume it through a storage event.
    - id: acknowledge
      action: Treat mailbox removal by the host tab as delivery confirmation and show that connection is continuing in the original tab.
  fallback:
    localStorage_unavailable: Show the answer URL or token for paste into the original ui:share-work-dialog.
    no_acknowledgement: Explain that the original host tab must remain open and offer manual paste.
  failure:
    invalid_or_unsupported_token: Show a safe error without writing localStorage or echoing decoded SDP.
```
