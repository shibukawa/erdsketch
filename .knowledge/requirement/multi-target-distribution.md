---
id: requirement:multi-target-distribution
type: requirement
title: Multi-Target Distribution
---

One frontend codebase produces explicit static-web, server-web, and Wails-desktop distributions.

```yaml
targets:
  static_web: requirement:static-web-distribution
  server_web: requirement:server-web-distribution
  wails_desktop: requirement:wails-desktop-distribution
shared:
  - React and TypeScript modeling UI
  - data:project-document-set
  - data:portable-project-archive
  - modeling behavior and validation
  - decision:shared-go-export-engine export semantics
target_specific:
  - runtime bootstrap
  - persistence adapter
  - collaboration transport availability
  - packaging and release metadata
  - native Go versus TinyGo/WASM export adapter
build_contract:
  - Each target has one documented noninteractive build command.
  - Each target writes to an isolated output directory.
  - The selected runtime mode is embedded at build time.
  - Optional capability detection occurs inside the selected mode.
  - Building one target does not mutate source or another target's output.
  - CI builds every target from a clean checkout.
acceptance:
  - A project exported by any target imports into every other target.
  - Shared frontend tests run independently of runtime adapters.
  - Target-specific tests fail when forbidden runtime dependencies are introduced.
  - Export formats have one Go implementation and native/WASM parity tests prevent behavioral forks.
```
