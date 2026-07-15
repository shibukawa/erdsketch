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
    location:
      erd: model_card_top_right
      dfd: selected_model_top_right
    appearance: hamburger_like
    label: Open field list
    surfaces:
      erd:
        source: ui:erd-sketch-canvas
        visibility: model_card
      dfd:
        source: ui:dfd-sketch-canvas
        visibility: selected_model
  root:
    kind: dialog
    id: model-field-list
    title: Fields
    name-display-mode:
      requirement: requirement:name-display-switching
      kind: segmented-control
      options:
        - business_name
        - system_name
        - physical_name
      applies_to:
        - containing_table_label
        - attribute_rows
        - relationship_reference_rows
        - assigned_domain_labels
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
            domain_drop_target: ui:domain-dictionary-dialog
            controls:
              - name
              - primary_key
              - important
              - required
              - unique
              - default
              - value_generation
              - estimated_average_size_bytes
              - data:data-domain
            estimated_average_size_bytes:
              item: data:field-size-estimate
              unit: bytes
              visible_for_effective_types:
                - varchar
                - text
                - blob
          relationship_reference:
            item_interaction: click_to_edit_reference_flags
            name_source: data:relationship.name
            controls:
              - primary_key
              - foreign_key
              - canvas_visibility
            canvas_visibility:
              values:
                - shown
                - hidden
              scope: current_model
              hidden_row_behavior: keep_in_dialog_with_hidden_state
      - kind: side-panel
        target: ui:model-refinement-panel
      - kind: action-group
        id: physical-table-design
        actions:
          - open_ui:index-definition-dialog
          - open_ui:partition-definition-dialog
          - open_ui:volume-view
accessibility:
  - Icon button has an accessible name and visible focus state.
  - Dialog traps focus and supports Escape to close.
  - Flag controls expose checked state and text labels.
constraints:
  - ERD and DFD open this same dialog component for the same project model definition.
  - Opening from DFD must not copy fields into placement-local state.
  - The list visually integrates attributes and relationship references without sharing their data model.
  - Canvas visibility changes only the current model projection and has no SQL effect.
  - Quick entry creates only data:attribute.
  - Do not offer foreign-key controls for data:attribute rows.
  - Important is presentational metadata only.
  - Selecting primary key also selects favorite according to rule:primary-key-favorite.
  - Favorite cannot be effectively disabled while primary key remains selected.
  - Preserve Japanese IME composition behavior.
  - Composite domain assignments render as one logical attribute row.
  - Primary-key row drag order persists according to rule:primary-key-column-order.
  - Composite index grouping is delegated to ui:index-definition-dialog.
  - Partition ranges are delegated to ui:partition-definition-dialog.
  - Estimated average size is conditional on effective variable-width type and has no DDL effect.
  - ui:domain-dictionary-panel provides only quick name capture and launch.
  - Detailed domain assignment is performed in ui:domain-dictionary-dialog.
  - Name display mode changes labels only and preserves all edits and references.
related:
  - requirement:field-list-management
  - data:attribute
  - rule:primary-key-favorite
  - data:relationship-reference
  - rule:field-list-sort
  - ui:domain-dictionary-panel
  - ui:domain-dictionary-dialog
  - ui:model-refinement-panel
  - data:data-domain
  - rule:domain-expansion
  - requirement:sql-table-definition
  - rule:primary-key-column-order
  - ui:index-definition-dialog
  - ui:partition-definition-dialog
  - data:field-size-estimate
  - ui:volume-view
```
