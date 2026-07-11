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
        projection_items:
          - data:attribute
          - data:relationship-reference
        persistence_union: false
        projection_visibility:
          one_to_many: many_endpoint
          many_to_one: many_endpoint
          one_to_one: arrow_origin_endpoint
          many_to_many: both_endpoints
        sort: rule:field-list-sort
        rows:
          attribute:
            item_interaction: click_to_edit
            domain_drop_target: ui:domain-dictionary-panel
            controls:
              - name
              - primary_key
              - important
              - data:data-domain
          relationship_reference:
            item_interaction: click_to_edit_reference_flags
            name_source: data:relationship.name
            controls:
              - primary_key
              - foreign_key
accessibility:
  - Icon button has an accessible name and visible focus state.
  - Dialog traps focus and supports Escape to close.
  - Flag controls expose checked state and text labels.
constraints:
  - The list visually integrates attributes and relationship references without sharing their data model.
  - Quick entry creates only data:attribute.
  - Do not offer foreign-key controls for data:attribute rows.
  - Important is presentational metadata only.
  - Selecting primary key also selects favorite according to rule:primary-key-favorite.
  - Favorite cannot be effectively disabled while primary key remains selected.
  - Preserve Japanese IME composition behavior.
  - Composite domain assignments render as one logical attribute row.
related:
  - requirement:field-list-management
  - data:attribute
  - rule:primary-key-favorite
  - data:relationship-reference
  - rule:field-list-sort
  - ui:domain-dictionary-panel
  - data:data-domain
  - rule:domain-expansion
```
