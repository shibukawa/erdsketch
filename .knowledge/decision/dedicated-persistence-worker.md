---
id: decision:dedicated-persistence-worker
type: decision
title: Dedicated Persistence Worker
---

Browser persistence runs behind a dedicated worker while session authority remains in the host frontend.

```yaml
boundary:
  window:
    - React UI and actor:session-host canonical memory
    - semantic validation, edit locks, conflict resolution, and accepted operation ordering
    - user-gesture file and directory pickers
    - browser download initiation
    - RTCPeerConnection creation and signaling
  worker: system:persistence-worker
worker_owns:
  - system:origin-private-project-store handles
  - named and temporary project catalog I/O
  - recovery journal append, flush, checkpoint, and replay
  - archive compression, decompression, and checksums
  - transferable binary buffers used by import and export
rationale:
  - keep durable I/O and compression off the UI thread
  - serialize storage mutations in one owner
  - prepare a message boundary reusable by future WebRTC collaboration
  - enable synchronous OPFS access handles where supported
compatibility:
  preferred: dedicated_worker_with_FileSystemSyncAccessHandle
  fallback:
    - dedicated_worker_with_async_OPFS
    - existing_window_persistence_adapter_when_worker_startup_is_unavailable
constraints:
  - Moving persistence does not move authority away from actor:session-host.
  - User activation cannot be delegated to the worker.
  - Worker execution does not extend storage lifetime after the page or browser terminates.
  - Durable mutations fail closed until worker recovery succeeds.
```
