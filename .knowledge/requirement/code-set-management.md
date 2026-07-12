---
id: requirement:code-set-management
type: requirement
title: Code Set Management
---

Users define an ordered set of named scalar codes as a domain primitive choice.

```yaml
requirements:
  entry_point:
    surface: ui:domain-dictionary-dialog
    interaction: select_code_set_as_primitive_type
  base_type:
    label: Storage type
    choices:
      - varchar
      - decimal
      - integer
  entry_creation:
    interaction: type_name_then_press_Enter
    result: append_entry_and_keep_input_ready
    repeatable: true
    trim_whitespace: true
    reject_empty_name: true
    ime_safe: true
  entry_editing:
    fields:
      - name
      - value
    value_type: selected_base_type
  ordering:
    interaction: drag_rows
    persistence: explicit_order
  projection:
    storage: selected_base_type
    database_native_enum: false
acceptance:
  - Selecting code_set reveals base-type selection, quick name entry, and an ordered entry list.
  - Repeated typing and Enter appends entries without losing input focus.
  - Japanese IME confirmation never creates an unintended entry.
  - Each entry stores an editable name and scalar value.
  - Dragging rows changes and persists entry order.
  - Entry values are validated against varchar, decimal, or integer according to base_type.
  - Schema export uses the scalar base type and never creates a database-native enum.
```

