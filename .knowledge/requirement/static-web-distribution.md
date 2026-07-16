---
id: requirement:static-web-distribution
type: requirement
title: Static Web Distribution
---

Static web distribution runs from GitHub Pages without a Go process or application server.

```yaml
artifact:
  contents:
    - HTML
    - CSS
    - JavaScript
    - bundled_initial_seed_documents
    - static_assets
  forbidden:
    - Go executable
    - server-only configuration
    - required API endpoint
runtime:
  persistence: decision:storage-adapter-selection static_content_mode
  collaboration:
    local_host: supported
    manual_peer_to_peer: system:webrtc-collaboration-transport
    Go_relay: unavailable
  API_behavior: do_not_probe_or_require_/api
github_pages:
  deployment: GitHub Actions
  source: static_web_build_output
  triggers:
    - default_branch_update
    - manual_dispatch
  requirements:
    - Resolve assets under the configured repository base path.
    - Serve only the selected static artifact.
    - Use HTTPS capabilities provided by GitHub Pages.
    - Report build or deployment failure without replacing the last successful site.
acceptance:
  - Opening the project Pages URL reaches a usable workspace.
  - Reloading a supported application URL does not break asset loading.
  - Browser developer tools show no required backend request.
  - Once loaded, modeling, recovery, import, and export do not depend on backend network access.
  - Missing browser file-picker APIs follow requirement:portable-project-persistence fallbacks.
```
