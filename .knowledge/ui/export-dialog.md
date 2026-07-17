---
id: ui:export-dialog
type: ui
title: Export Dialog
---

Export Dialog is the single entry point for project artifact generation.

```yaml
ui:
  entry:
    source: ui:workspace-header
    control: rightmost_red_artifact_export_button
  root:
    kind: dialog
    id: export-dialog
    title: Export
    mode:
      kind: segmented-control
      options:
        - diagram
        - document
        - json
        - sql
    panels:
      diagram:
        requirement: requirement:diagram-export
        controls:
          - artifact_selection
          - name_mode
          - model_card_content
      document:
        requirement: requirement:document-bundle-export
        controls:
          - artifact_selection
          - name_mode
          - model_card_content
          - bundle_summary
      json:
        requirement: requirement:json-codegen-export
        controls:
          - package_mode: json_only | json_and_schema
          - model_selection
          - bundle_summary
          - validation_results
      sql:
        requirement: requirement:sql-ddl-export
        controls:
          - dialect_selection
          - validation_results
    actions:
      - validate
      - export
      - cancel
  validation_results:
    source: data:export-diagnostic
    group_by:
      - severity
      - artifact
    item_actions:
      - jump_to_source
  presentation_defaults:
    source: ui:model-card-display-mode
    capture: when_dialog_opens
    export_controls:
      - name_mode
      - model_card_content
    independently_mutable: true
states:
  configuring:
    export_enabled: depends_on_mode
  validating:
    export_enabled: false
  blocked:
    export_enabled: false
    focus: validation_results
  ready:
    export_enabled: true
  generating:
    export_enabled: false
constraints:
  - The header Export button opens this dialog; it never exports the editable project archive directly.
  - Switching mode preserves each mode's settings until the dialog closes.
  - Diagram and document presentation controls initially match the current card display settings.
  - Changing export presentation never changes the canvas card display settings.
  - Export uses one immutable project snapshot captured after validation.
  - A blocking diagnostic prevents only the affected export attempt.
  - Every actionable diagnostic can navigate to its owning editor or canvas item.
flow: flow:export-project-artifacts
```
