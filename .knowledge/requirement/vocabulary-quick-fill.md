---
id: requirement:vocabulary-quick-fill
type: requirement
title: Vocabulary Quick Fill
---

Users complete common English vocabulary mappings by filling every missing technical name in one action.

```yaml
surface: ui:vocabulary-view
tab: word_list
availability:
  modes:
    - selection_list
    - bulk_settings
actions:
  copy_as_is:
    visible_when: any data:vocabulary-entry system_name is empty
    target: every_empty system_name
    value: trimmed business_name
  copy_as_small:
    visible_when: any data:vocabulary-entry physical_name is empty
    target: every_empty physical_name
    value: snake_case business_name
constraints:
  - Non-empty target names are never overwritten.
  - Each action persists all affected entries to data:project.
  - Buttons disappear when no eligible empty target remains.
acceptance:
  - Copy as is fills only empty system names.
  - Copy as small fills only empty physical names.
  - Both actions are available from the standard word list and Bulk settings.
```
