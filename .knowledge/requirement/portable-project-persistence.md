---
id: requirement:portable-project-persistence
type: requirement
title: Portable Project Persistence
---

Users load and save the same project content in server-web, static-web, and Wails-desktop deployments.

```yaml
authority: actor:session-host
contract: data:project-document-set
selection: decision:storage-adapter-selection
operations:
  - create_from_initial_seeds
  - load
  - save
  - import_archive
  - export_archive
  - recover_after_restart
acceptance:
  - Go backend mode loads initial seeds and reads and writes local project files.
  - Static mode works without a Go process.
  - Wails desktop mode works without an external Go process or HTTP server.
  - Wails desktop mode uses system:wails-project-file-adapter for user-selected native files.
  - Wails WebView mode records accepted durable mutations in system:origin-private-project-store before acknowledgement.
  - Static mode can use a user-selected local location when system:browser-local-file-adapter is available.
  - Every browser mode records accepted durable mutations in system:origin-private-project-store before acknowledgement.
  - Restart on the same device and origin restores the latest checkpoint plus valid journal tail.
  - Named and temporary OPFS projects follow requirement:named-opfs-project-management.
  - Safari uses OPFS recovery and explicit archive import or export when persistent external folder handles are unavailable.
  - Every mode imports and exports data:portable-project-archive.
  - Failed load does not replace the current in-memory project.
  - Failed save preserves the previous durable project.
  - Non-host participants cannot initiate durable project replacement.
  - Site-data deletion and device loss remain explicit backup risks.
  - Project load, save, import, and export entry points are consolidated in ui:project-management-dialog.
  - Missing browser picker APIs never leave enabled nonfunctional Open or Save controls.
```
