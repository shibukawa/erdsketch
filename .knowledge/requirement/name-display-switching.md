---
id: requirement:name-display-switching
type: requirement
title: Name Display Switching
---

Users switch table, field, and domain labels among vocabulary name forms without changing model identity.

```yaml
modes:
  - business_name
  - system_name
  - physical_name
targets:
  table: data:entity
  field: data:attribute
  domain: data:data-domain
surfaces:
  canvas:
    control: ui:model-card-display-mode
    scope: current_erd_canvas
    targets:
      - table
      - field
  field_editor:
    control: ui:field-list-dialog.name-display-mode
    scope: current_dialog
    targets:
      - table
      - field
      - domain
  domain_editor:
    control: ui:domain-dictionary-dialog.name-display-mode
    scope: current_dialog
    targets:
      - domain
behavior:
  presentation_only: true
  editing_identity_unchanged: true
  source: data:vocabulary-match-cache
  matching_on_switch: forbidden
  missing_selected_name: show_available_name_with_missing_indicator
  unmatched_segment: requirement:unmatched-name-presentation
acceptance:
  - One control switches every applicable label on its surface.
  - Field editing can show the containing table, fields, and assigned domains in the selected mode.
  - Domain editing can show all domain names in the selected mode.
  - Switching names never modifies vocabulary values.
  - System and physical modes preserve visible red unmatched spans.
```
