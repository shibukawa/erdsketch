---
id: ui:model-refinement-panel
type: ui
title: Model Refinement Panel
---

The field-list side panel switches between domain selection and refinement patterns without hiding unavailable patterns.

```yaml
ui:
  root:
    kind: panel
    id: field-list-side-panel
    children:
      - kind: tabs
        id: field-list-tools
        children:
          - kind: tab
            id: domains
            target: ui:domain-dictionary-panel
          - kind: tab
            id: refinement-patterns
            target: pattern-list
      - kind: pattern-list
        id: model-refinement-patterns
        visibility: all_patterns_always
        item:
          fields:
            - title
            - description
            - availability
          enabled_action: open_pattern_input
          disabled_action: none
          disabled_reason:
            interaction:
              - pointer_hover
              - keyboard_focus
            content: all_missing_preconditions
      - kind: pattern-input
        state: selected_pattern
        children:
          - pattern_specific_form
          - transformation_preview
          - apply
          - cancel
availability:
  recompute_on:
    - field_selection_change
    - selected_model_change
    - attribute_or_relationship_change
  field_patterns:
    common_requirement: at_least_one_selected_row
  model_patterns:
    common_requirement: exactly_one_selected_model
accessibility:
  - Disabled reasons are available without pointer hover.
  - Disabled items expose disabled state and reason to assistive technology.
  - Tab and pattern selection are keyboard operable.
constraints:
  - A disabled pattern remains visible and cannot open or apply.
  - Missing-precondition text names every corrective action, not only the first failure.
  - Relationship-reference rows count only where a pattern explicitly permits them.
  - ui:domain-dictionary-panel behavior is unchanged.
```

related:
  - requirement:model-refinement-patterns
  - ui:field-list-dialog
  - ui:domain-dictionary-panel
  - data:relationship-reference

