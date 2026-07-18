---
id: ui:vocabulary-view
type: ui
title: Vocabulary View
---

Users browse vocabulary, edit one selected term in a sidebar, batch-edit when needed, and inspect read-only usage.

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
              - kind: vocabulary-table
                item: data:vocabulary-entry
                default_interaction: select_row
                inline_inputs_visible: false
                placeholders: none
                columns:
                  - business_name
                  - system_name
                  - physical_name
                row_backgrounds:
                  system_name_empty: orange
                  physical_name_empty: yellow
                multi_condition_presentation: preserve_each_indicator
              - kind: quick-fill-toolbar
                requirement: requirement:vocabulary-quick-fill
                visible_in:
                  - selection_list
                  - bulk_settings
                actions:
                  - copy_as_is
                  - copy_as_small
              - kind: button
                label: Bulk settings
                target: bulk-settings
              - kind: bulk-settings
                id: bulk-settings
                initial_visibility: hidden
                behavior: dense_inline_editor
                placeholders: none
              - kind: details-sidebar
                visible_when: row_selected
                fields:
                  - meaning
                  - notes
                  - aliases
                  - usage_list
                  - suggestion_state
                text_inputs:
                  business_name:
                    spellcheck: true
                    lang: selected_language
                  system_name:
                    spellcheck: true
                    lang: selected_language
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
                primary_status:
                  max_visible: 1
                  priority:
                    - unregistered: red
                    - missing_system_name: orange_squiggle
                    - missing_physical_name: yellow_squiggle
                    - alias_match: purple
                    - complete: green
                correction_action:
                  requirement: requirement:vocabulary-alias-correction
                  label: Replace with preferred term
      - kind: name-display-selector
        modes:
          - business
          - system
          - physical
          - system_and_physical
      - kind: ai-suggestion-toolbar
        settings: data:vocabulary-ai-settings
        action: requirement:ai-vocabulary-assistance
      - kind: row-suggestion-list
        item: data:vocabulary-suggestion
        placement: relevant_vocabulary_row
        actions:
          - accept
          - reject
requirements: requirement:vocabulary-management
```
