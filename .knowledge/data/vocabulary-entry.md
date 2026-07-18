---
id: data:vocabulary-entry
type: data
title: Vocabulary Entry
---

Vocabulary entry is a project-owned term defined before use in model names.

```yaml
fields:
  - name: id
    type: identifier
  - name: business_name
    type: text
  - name: system_name
    type: text
  - name: physical_name
    type: text
  - name: meaning
    type: text
    optional: true
  - name: notes
    type: text
    optional: true
  - name: aliases
    type: text_list
    optional: true
  - name: suggestion_state
    type: enum
    values:
      - confirmed
      - ai_suggested
constraints:
  - id remains hidden in ui:vocabulary-view.
  - The three names are the primary visible contract.
  - meaning, notes, aliases, and usage appear in the selected-entry sidebar.
  - business_name is required at creation.
  - system_name and physical_name may remain empty.
  - Entries exist independently of model usage.
  - aliases store recognized synonyms or alternate wording that should resolve to business_name.
  - Alias matches remain correction-required rather than accepted preferred wording.
assistance: requirement:ai-vocabulary-assistance
quick_fill: requirement:vocabulary-quick-fill
alias_correction: requirement:vocabulary-alias-correction
```
