---
id: policy:ice-server-configuration
type: policy
title: ICE Server Configuration
---

```yaml
profiles:
  default:
    label: Google STUN
    selection: exactly_one_built_in_url_per_connection
    urls:
      - stun:stun.l.google.com:19302
      - stun:stun1.l.google.com:19302
      - stun:stun2.l.google.com:19302
      - stun:stun3.l.google.com:19302
      - stun:stun4.l.google.com:19302
  custom_stun:
    fields:
      - urls
  custom_turn:
    fields:
      - urls
      - username
      - credential
validation:
  stun_schemes:
    - stun
    - stuns
  turn_schemes:
    - turn
    - turns
  require_turn_username_and_credential: true
  reject_embedded_url_credentials: true
handling:
  - Each peer configures its own RTCPeerConnection with the selected profile.
  - Custom TURN credentials remain in page memory unless the user explicitly opts into local storage.
  - TURN credentials never enter data:share-work-token, logs, analytics, project files, or collaboration messages.
  - Failure of a public STUN service is reported as ICE gathering or connection failure.
  - Built-in endpoints are versioned application configuration and may be replaced without changing token format.
```
