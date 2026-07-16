---
id: requirement:server-web-distribution
type: requirement
title: Server Web Distribution
---

Server web distribution preserves the Go-backed browser runtime and packages its frontend for production use.

```yaml
artifact:
  required:
    - Go server executable
    - production frontend assets
  production_origin:
    UI: same_as_API
    API_prefix: /api
  development:
    frontend: Vite development server
    API: Go server through Vite proxy
runtime:
  persistence: decision:storage-adapter-selection go_backend_mode
  collaboration: system:collaboration-relay
  initial_seeds: Go seed service
compatibility:
  - Preserve existing relative /api contracts and server-sent event behavior.
  - Preserve actor:session-host write authority.
  - Preserve standalone project recovery when relay delivery fails after startup.
acceptance:
  - One documented production start command serves both the UI and API contract.
  - The production UI does not require the Vite development server.
  - Project file access remains confined to system:native-project-file-adapter.
  - Graceful shutdown stops accepting new requests before process exit.
  - Existing Go package and frontend tests pass for the server target.
```
