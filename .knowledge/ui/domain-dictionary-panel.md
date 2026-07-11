---
id: ui:domain-dictionary-panel
type: ui
title: Domain Dictionary Panel
---

Compact companion panel for fast domain capture beside the field list dialog.

```yaml
ui:
  placement: right_of_ui:field-list-dialog
  window: compact_companion_surface
  children:
    - kind: text-input
      id: domain-quick-entry
      submit: Enter_when_not_ime_composing
      after_submit:
        - create_unresolved_data:data-domain
        - retain_focus
    - kind: button
      id: open-domain-dictionary
      label: Open domain dictionary
      action: ui:domain-dictionary-dialog
    - kind: text-input
      id: domain-search
      behavior: filter_as_you_type
      targets:
        - domain_name
        - primitive_type
        - component_name
        - category_name
    - kind: list
      id: domain-candidates
      interactions:
        - drag_to_field_row
      eligibility: every_domain
accessibility:
  - Quick entry and open action have distinct accessible labels.
constraints:
  - Quick entry does not expose type controls.
  - Quick entry does not assign a domain automatically.
  - Drag hover highlights the whole field row and emphasizes its domain cell; it never shows the row-reorder insertion line.
```
