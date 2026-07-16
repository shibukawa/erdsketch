---
id: requirement:wails-desktop-distribution
type: requirement
title: Wails Desktop Distribution
---

Wails desktop distribution bundles the shared frontend with in-process Go capabilities as a native application.

```yaml
artifact:
  form: platform_native_application
  contains:
    - production frontend assets
    - Wails runtime
    - Go application services
  release_identity:
    - application_name
    - semantic_version
    - target_OS
    - target_architecture
runtime:
  external_Go_server: not_required
  local_listening_port: forbidden_for_local_only_features
  persistence: system:wails-project-file-adapter
  frontend_backend_boundary: generated_Wails_bindings
  browser_HTTP_handlers: not_used_for_in_process_calls
architecture:
  - Reuse storage-neutral Go services below HTTP and Wails adapters.
  - Keep Wails bootstrap and bindings outside reusable domain packages.
  - Keep browser-only globals behind frontend runtime adapters.
collaboration:
  local_host: supported
  manual_peer_to_peer: system:webrtc-collaboration-transport when WebView capability permits
  embedded_single_window_relay: not_required
acceptance:
  - The application opens a usable workspace without a browser or separately started server.
  - Native open and save dialogs exchange data:project-document-set without exposing absolute paths to shared frontend state.
  - Accepted durable changes survive application restart according to rule:continuous-project-recovery.
  - Import and export use the same data:portable-project-archive bytes as web targets.
  - Closing the last window flushes pending durable writes or reports failure before exit.
  - Supported OS and architecture pairs are explicitly declared by release automation.
  - A clean build fails clearly when a required platform packaging tool is missing.
```
