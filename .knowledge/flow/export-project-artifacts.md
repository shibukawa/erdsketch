---
id: flow:export-project-artifacts
type: flow
title: Export Project Artifacts
---

```yaml
flow:
  trigger: user opens ui:export-dialog
  steps:
    - id: choose-mode
      action: choose diagram, document, JSON, or SQL export
    - id: configure
      action: choose mode-specific artifacts and presentation, model, or dialect options
    - id: capture
      action: capture one immutable project snapshot and option set
    - id: validate
      action: validate requested artifacts and emit data:export-diagnostic
    - id: resolve
      condition: blocking diagnostics exist
      action: user jumps to source, edits project, returns, and revalidates
    - id: generate
      condition: no blocking diagnostics
      action: call decision:shared-go-export-engine for requirement:diagram-export, requirement:document-bundle-export, requirement:json-codegen-export, or requirement:sql-ddl-export output
    - id: deliver
      action: download generated file or files
  failure:
    validation: preserve options and diagnostics
    generation: preserve options and report artifact-level failure
    partial_download: forbidden
```
