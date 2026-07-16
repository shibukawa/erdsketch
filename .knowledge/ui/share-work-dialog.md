---
id: ui:share-work-dialog
type: ui
title: Co-work Dialog
---

```yaml
ui:
  root:
    kind: dialog
    id: share-work
    title: Co-work
    state:
      - configure
      - gathering
      - waiting_for_answer
      - connecting
      - connected
      - failed
    children:
      - kind: input
        id: invitation-label
        max_characters: 30
        placeholder: Model, project, or host name
      - kind: select
        id: access-mode
        options:
          - edit
          - readonly
      - kind: select
        id: ice-profile
        source: policy:ice-server-configuration
      - kind: input
        id: custom-stun-url
        visible_when: ice-profile_is_custom_stun
      - kind: input-group
        id: custom-turn
        fields:
          - urls
          - username
          - credential
        visible_when: ice-profile_is_custom_turn
      - kind: button
        label: Create invitation
        action: flow:create-share-work-invitation
      - kind: output
        id: invitation-url
        visible_when: waiting_for_answer
        actions:
          - copy
          - navigator_share_when_available
      - kind: input
        id: answer-url-or-token
        visible_when: waiting_for_answer
      - kind: button
        label: Apply answer
        action: flow:complete-manual-webrtc-signaling
      - kind: status
        id: connection-status
      - kind: button
        label: Invite another collaborator
        action: flow:continue-cowork-session
        visible_when: connected_peer_count_gt_zero
      - kind: input
        id: disconnect-message
        max_characters: 120
        visible_when: connected_peer_count_gt_zero
      - kind: button
        label: Disconnect all
        action: flow:disconnect-cowork-session
        visible_when: connected_peer_count_gt_zero
constraints:
  - Secret credentials use masked input with an explicit reveal action.
  - Create invitation is disabled while ICE configuration is invalid.
  - Closing or reloading the host page invalidates every pending invitation.
  - The waiting state says to open the returned '#as=' URL in another tab or window, never over the host tab.
  - Each invitation accepts at most one participant.
  - Accepting an answer closes the dialog because its invitation is consumed; connection establishment continues in the host page.
  - Reopening Co-work with connected peers enters the invitation step and creates a new peer-specific invitation from retained configuration.
```
