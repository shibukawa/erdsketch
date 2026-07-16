---
id: requirement:webrtc-share-work
type: requirement
title: WebRTC Co-work
---

Users share the current project through a direct WebRTC data connection without making project data authoritative on a backend.

```yaml
requirements:
  - actor:session-host starts one invitation per remote peer from ui:share-work-dialog.
  - The host selects edit or readonly access before creating the invitation.
  - An invitation may include an optional host-authored label of at most 30 Unicode characters for a model, project, or host name.
  - The participant reviews the invitation label before producing an answer.
  - flow:create-share-work-invitation produces a copyable URL and uses navigator.share when available.
  - A page opened with a valid '#iv=' fragment enters flow:join-shared-work.
  - A participant returns a copyable '#as=' answer URL through chat or another user-selected channel.
  - A page opened with a valid '#as=' fragment enters flow:relay-webrtc-answer.
  - Invitation and answer parsers use data:share-work-token declared length to isolate the token and ignore any trailing text captured as part of the URL by a wiki, social network, or chat client.
  - flow:complete-manual-webrtc-signaling returns the participant answer to the waiting host.
  - Connected peers use system:webrtc-collaboration-transport and flow:host-authoritative-collaboration.
  - flow:continue-cowork-session adds participants without returning to ICE configuration.
  - One logical Co-work session may contain multiple peer-specific invitation and answer exchanges.
  - ui:cowork-participant-tooltip exposes the complete participant list from the Co-work button and header initials.
  - flow:disconnect-cowork-session closes every host peer and may deliver a short human-readable reason first.
  - A participant persists data:cowork-participant-checkpoint after each accepted host snapshot.
  - Unexpected transport loss or page restoration enters flow:recover-disconnected-cowork-participant before normal workspace-start UI.
  - A disconnected participant may retain and view the last host snapshot as another person's read-only model, or close the participant workspace.
  - A retained participant snapshot cannot be edited, promoted to a local project, or used to assume host authority.
  - permission:collaboration-session-access is enforced by the host, not trusted from a received token.
compatibility:
  required:
    - RTCPeerConnection
    - RTCDataChannel
    - CompressionStream_deflate-raw
    - DecompressionStream_deflate-raw
  optional:
    - navigator.share
    - Clipboard_API
    - localStorage_cross_window_delivery
non_goals:
  - backend_project_storage
  - automatic_host_election
  - one_way_offer_only_connection_setup
```
