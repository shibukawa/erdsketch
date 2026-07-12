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
  - name: memo
    type: text
    optional: true
  - name: description
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
  - Optional metadata appears only in row details.
  - business_name is required at creation.
  - system_name and physical_name may remain empty.
  - Entries exist independently of model usage.
  - aliases are discouraged source terms used to detect incorrect wording.
  - aliases are not accepted synonyms for business_name.
assistance: requirement:ai-vocabulary-assistance
alias_correction: requirement:vocabulary-alias-correction
```
