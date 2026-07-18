---
id: flow:vocabulary-first-naming
type: flow
title: Vocabulary First Naming
---

Vocabulary-first naming defines reusable business terms before applying them to model elements.

```yaml
flow:
  trigger: User opens ui:vocabulary-view word-list tab.
  steps:
    - id: capture-business-terms
      action: repeatedly create data:vocabulary-entry with business_name and Enter
    - id: defer-technical-names
      action: leave system_name and physical_name empty when undecided
    - id: complete-entry
      action: edit names, meaning, notes, and aliases later
    - id: bind-model-name
      action: apply rule:vocabulary-resolution to create data:vocabulary-binding
    - id: inspect-coverage
      action: review requirement:vocabulary-usage-inspection
    - id: resolve-unmatched
      action: use requirement:vocabulary-segmentation-registration
    - id: generate-physical-name
      action: apply rule:sql-naming-policy to matched segments only
    - id: present-unmatched
      action: apply requirement:unmatched-name-presentation
  invariant: ui:vocabulary-view usage tab never edits source vocabulary.
```
