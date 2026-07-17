---
id: system:browser-local-file-adapter
type: system
title: Browser Local File Adapter
---

Browser local file adapter reads and writes user-selected files or directories through the File System Access API.

```yaml
availability:
  runtime: static_content_mode
  condition: showOpenFilePicker_or_showDirectoryPicker_and_required_write_APIs_are_present
selection: explicit_user_gesture
surface:
  dialog: ui:project-management-dialog
  tab: file-system
  launch_panel: ui:workspace-start-panel
execution:
  window: show picker and initiate download
  worker: system:persistence-worker reads, writes, compresses, and validates after selection
operations:
  - choose_project_file_or_directory
  - load_data:project-document-set
  - save_data:project-document-set
permissions:
  read: user_granted
  write: user_granted
fallback:
  primary: system:origin-private-project-store
  portability: data:portable-project-archive
constraints:
  - Feature detection selects this adapter; user-agent sniffing does not.
  - Safari without persistent picker handles uses import, archive export, and system:origin-private-project-store instead.
  - Permission denial or revocation is an ordinary recoverable error.
  - FileSystemHandle values never enter data:collaboration-message.
  - External writes do not replace rule:continuous-project-recovery.
  - Unsupported picker actions are disabled with an explanation instead of appearing as nonfunctional workspace controls.
```
