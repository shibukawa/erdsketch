---
id: ui:field-list-dialog
type: ui
title: Field List Dialog
---

Dialog for fast field capture and editing from a model card.

```yaml
ui:
  trigger:
    kind: icon-button
    id: model-field-menu
    location: model_card_top_right
    appearance: hamburger_like
    label: Open field list
  root:
    kind: dialog
    id: model-field-list
    title: Fields
    children:
      - kind: text-input
        id: field-quick-entry
        placeholder: Type a field name and press Enter
        submit: Enter_when_not_ime_composing
        after_submit:
          - append_to_list
          - clear_input
          - retain_focus
      - kind: list
        id: fields
        item: data:attribute
        item_interaction: click_to_edit
        item_controls:
          - name
          - primary_key
          - important
accessibility:
  - Icon button has an accessible name and visible focus state.
  - Dialog traps focus and supports Escape to close.
  - Flag controls expose checked state and text labels.
constraints:
  - Do not offer foreign-key controls.
  - Important is presentational metadata only.
  - Selecting primary key also selects favorite according to rule:primary-key-favorite.
  - Favorite cannot be effectively disabled while primary key remains selected.
  - Preserve Japanese IME composition behavior.
related:
  - requirement:field-list-management
  - data:attribute
  - rule:primary-key-favorite
```
