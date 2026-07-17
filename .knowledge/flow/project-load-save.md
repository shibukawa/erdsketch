---
id: flow:project-load-save
type: flow
title: Project Load and Save
---

```yaml
load:
  trigger: actor:session-host selects a source in ui:project-management-dialog or ui:workspace-start-panel.
  steps:
    - id: select
      action: resolve adapter through decision:storage-adapter-selection
    - id: read
      action: ask system:persistence-worker to obtain data:project-document-set or decode data:portable-project-archive
    - id: validate
      action: parse and validate the complete project without changing live state
    - id: commit
      action: atomically replace host frontend memory under decision:frontend-session-authority
    - id: checkpoint
      action: receive a durable checkpoint acknowledgement from system:persistence-worker before publication
    - id: publish
      action: send a data:collaboration-message state_snapshot to participants
    - id: navigate
      action: open ui:project-canvas-selector-dialog when load originated in ui:workspace-start-panel
  failure: keep_current_project_unchanged
save:
  trigger: actor:session-host requests save or export in ui:project-management-dialog.
  steps:
    - id: snapshot
      action: freeze one host-ordered project revision
    - id: recoverability
      action: verify rule:continuous-project-recovery covers the frozen revision
    - id: serialize
      action: create data:project-document-set and transfer large binary payloads to system:persistence-worker
    - id: write
      action: let system:persistence-worker use the selected adapter or data:portable-project-archive exporter
    - id: confirm
      action: report the exact saved host revision and destination kind
  failure: keep_previous_durable_version_and_host_memory
```
