---
id: ui:vocabulary-view
type: ui
title: Vocabulary View
---

Users edit the authoritative word list and inspect read-only model usage in separate tabs.

```yaml
ui:
  root:
    kind: view
    id: vocabulary-view
    children:
      - kind: tabs
        children:
          - kind: tab
            id: word-list
            label: Word list
            editable: true
            children:
              - kind: quick-entry
                field: business_name
                submit: Enter
              - kind: vocabulary-table
                item: data:vocabulary-entry
                columns:
                  - business_name
                  - system_name
                  - physical_name
              - kind: row-details
                collapsed: true
                fields:
                  - meaning
                  - memo
                  - aliases
                  - usage_list
                  - suggestion_state
          - kind: tab
            id: usage
            label: Usage
            editable: false
            children:
              - kind: scope-selector
                values:
                  - tables
                  - domains
              - kind: owner-list
              - kind: usage-table
                item: data:vocabulary-usage
                status_icons:
                  unmatched: red
                  correction_required: red
                  incomplete: yellow
                  complete: green
                correction_action:
                  requirement: requirement:vocabulary-alias-correction
                  label: Replace with preferred term
      - kind: name-display-selector
        modes:
          - business
          - system
          - physical
          - system_and_physical
      - kind: vocabulary-suggestion-panel
        item: data:vocabulary-suggestion
        visible_when: incomplete_row_has_suggestions
        apply_interaction: click_suggestion
requirements: requirement:vocabulary-management
```
