---
id: flow:start-project-from-launch-panel
type: flow
title: Start Project from Launch Panel
---

```yaml
flow:
  trigger: actor:session-host selects a source in ui:workspace-start-panel
  steps:
    - id: resolve_source
      action: resolve empty, data:starter-project-template, saved OPFS, known external file, or uploaded archive source
    - id: obtain
      action: clone bundled content or ask system:persistence-worker to read data:project-document-set
    - id: validate
      action: validate the complete project without changing live state
    - id: instantiate
      condition: empty_or_template
      action: allocate a new project identity and create a recoverable temporary project
    - id: commit
      action: atomically install data:project under decision:frontend-session-authority
    - id: checkpoint
      action: wait for durable acknowledgement from system:persistence-worker
    - id: choose_canvas
      action: open ui:project-canvas-selector-dialog without preselecting ERD or DFD
  failure:
    result: keep_ui:workspace-start-panel_open
    preserve: previous_durable_project_and_memory
  success:
    panel: close
    project_manager: available_later
```
