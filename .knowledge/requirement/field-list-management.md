---
id: requirement:field-list-management
type: requirement
title: Field List Management
---

Users manage a model seed's fields without leaving the canvas.

```yaml
requirements:
  entry_point:
    location: model_card_top_right
    control: compact_menu_icon
    action: open ui:field-list-dialog
  create:
    interaction: type_field_name_then_press_Enter
    result: append_field_and_keep_input_ready
    repeatable: true
    trim_whitespace: true
    reject_empty_name: true
    ime:
      composition_Enter: confirm_composition_only
      add_on_Enter: only_when_not_composing
  edit:
    interaction: click_existing_field
    editable:
      - name
      - primary_key
      - important
  flags:
    primary_key: schema_meaning
    important: visual_emphasis_only
    implication: primary_key_sets_important_true
    independent_favorite: important_may_be_true_without_primary_key
  excluded:
    - foreign_key_assignment
    - relationship_creation
acceptance:
  - Repeated typing and Enter appends multiple fields without reopening the dialog.
  - Japanese IME confirmation never creates an unintended field.
  - Clicking a field exposes editing for its name and flags.
  - Setting primary key automatically sets important.
  - A field may be important without being a primary key.
  - A primary-key field remains effectively important.
  - Important never changes SQL meaning.
related:
  - data:attribute
  - data:relationship
  - ui:field-list-dialog
  - rule:primary-key-favorite
```
