---
id: data:split-by-code-set-pattern
type: data
title: Split Model by Code Set Pattern
---

Create one model per code-set entry when each status or kind needs a different model.

```yaml
description: Split a model into variants selected by code-set values.
preconditions:
  context: ui:field-list-dialog
  selected_code_set_attributes_minimum: 1
  every_selected_attribute_has: data:code-set
inputs:
  - inherit_parent
  model_name_by_code_set_entry:
    preset: code_set_entry_name + current_model_name
actions:
  - create one model for every entry of every selected code set
  - inherit source independence/dependence and role
  - keep selected code-set key attributes on the source parent
  - copy every relationship incident to source for each new model with equivalent direction, type, multiplicity, flags, and visibility
relationship_mode:
  inherit_parent_true:
    relationship:
      kind: inherit
      direction: child_to_source_parent
    attribute_projection: rule:inherit-attribute-projection
    card_display: show inherited parent attributes on each child
    child_owned_field_copy: none
  inherit_parent_false:
    relationship:
      kind: foreign_key
      direction: child_to_source_parent
      multiplicity: "1:1"
    attribute_projection: none
    child_owned_field_copy: all non-selected source fields
constraints:
  - Generated model names are editable before apply and unique.
  - The source model remains unchanged.
  - Empty code sets disable the pattern and report that entries are missing.
  - inherit_parent selects exactly one relationship mode and defaults to false.
  - Inherited attributes remain parent-owned and are not duplicated as child-owned logical attributes.
```

related:
  - requirement:model-refinement-patterns
  - data:code-set
  - data:relationship
  - rule:inherit-attribute-projection
