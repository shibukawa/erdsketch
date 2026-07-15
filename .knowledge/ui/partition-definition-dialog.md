---
id: ui:partition-definition-dialog
type: ui
title: Partition Definition Dialog
---

Dedicated dialog edits range keys and named range boundaries for a projected SQL table.

```yaml
entry_points:
  - ui:field-list-dialog
  - selected_model_design_actions
controls:
  strategy:
    initial_value: range
    other_values: disabled_until_supported
  keys:
    source: projected_physical_columns
    preselection: requirement:domain-partition-key-marking
    reorder: drag
  ranges:
    add: true
    delete: true
    rename: true
    edit_from: true
    edit_to: true
presentation:
  boundary_semantics: show_inclusive_from_and_exclusive_to
  validation: inline
constraints:
  - Saving requires all data:partition-scheme errors to be resolved.
  - Gap warnings do not block save.
  - Free-form SQL is not used for range definitions.
```
