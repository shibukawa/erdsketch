---
id: system:webrtc-collaboration-transport
type: system
title: WebRTC Collaboration Transport
---

WebRTC transport is the future peer-to-peer data path for the existing host-authoritative collaboration protocol.

```yaml
topology:
  authority: actor:session-host
  connections: participants_to_host
channel: RTCDataChannel
protocol: data:collaboration-message
execution_boundary:
  window:
    - RTCPeerConnection
    - signaling
    - default RTCDataChannel event handling
  optional_transport_worker:
    condition: RTCDataChannel_transfer_is_feature_detected
    role: framing_backpressure_and_binary_transfer
  persistence:
    system: system:persistence-worker
    bridge: validated_host_operations_over_MessagePort_or_postMessage
requirements:
  - Transport replacement does not move authority away from actor:session-host.
  - Relay and WebRTC use the same message semantics and host sequence.
  - V1 setup follows decision:manual-webrtc-signaling and policy:ice-server-configuration.
  - Every peer has host-retained permission:collaboration-session-access.
  - Reconnection starts with a host state snapshot before new intents.
  - RTCDataChannel close, failed connection state, page restoration without the consumed invitation fragment, and stale participant heartbeat are session-loss signals for flow:recover-disconnected-cowork-participant.
  - Backpressure, maximum message size, and snapshot chunking are explicit transport concerns.
  - RTCDataChannel transfer to a worker is an optimization, not a compatibility requirement.
  - Network transport and durable persistence remain separate failure and backpressure domains.
non_goals:
  - multi_writer_peer_merge
  - implicit_host_election
  - CRDT_authority
  - moving_actor:session-host_authority_into_a_worker
open_decisions:
  - snapshot_chunk_size
```
