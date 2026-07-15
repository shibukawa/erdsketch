---
id: data:persistence-worker-message
type: data
title: Persistence Worker Message
---

Persistence worker message is the versioned request and response contract between Window and the durable I/O worker.

```yaml
transport: Worker_postMessage_or_MessagePort
request:
  required:
    - protocol_version
    - request_id
    - operation
  conditional:
    - project_id
    - expected_previous_host_sequence
    - payload
response:
  required:
    - protocol_version
    - request_id
    - status
  success:
    - durable_sequence
    - result
  error:
    - code
    - retryable
    - message
events:
  - ready
  - storage_pressure
  - writable_lock_lost
  - fatal_storage_error
rules:
  - Unknown protocol versions and operations are rejected.
  - A durable success means the journal record was flushed, not merely queued.
  - Binary archives and snapshots use transferable ArrayBuffer payloads when available.
  - Cancellation never rolls back a durable operation that has begun committing.
  - Errors are structured and do not expose browser-private paths.
```
