---
id: ui:index-definition-dialog
type: ui
title: Index Definition Dialog
---

Dedicated dialog groups projected columns into simple or composite indexes.

```yaml
entry_points:
  - ui:field-list-dialog
  - selected_model_design_actions
layout:
  source_columns:
    content: projected_physical_columns
    reusable_across_groups: true
  index_groups:
    create: true
    delete: true
    rename: true
    controls:
      - unique
    interaction:
      add_column: drag_or_select
      remove_column: true
      reorder_keys: drag
      change_direction: ascending_or_descending
behavior:
  one_group: data:index-definition
  group_order: presentation_only
  key_order: ddl_semantics
  save_validation:
    - nonempty_keys
    - no_duplicate_key_in_group
    - unique_name
constraints:
  - Composite-index grouping is not edited inline in attribute rows.
  - One projected column may participate in multiple index groups.
  - Closing without save preserves prior definitions.
```
