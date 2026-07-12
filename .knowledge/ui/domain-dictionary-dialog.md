---
id: ui:domain-dictionary-dialog
type: ui
title: Domain Dictionary Dialog
---

Wide workspace for defining, searching, and assigning data:data-domain entries.

```yaml
ui:
  root:
    kind: dialog
    id: domain-dictionary
    title: Domain dictionary
    height: same_as_ui:field-list-dialog
    layout: three_pane
    name-display-mode:
      requirement: requirement:name-display-switching
      kind: segmented-control
      options:
        - business_name
        - system_name
        - physical_name
      applies_to:
        - domain_list
        - domain_details
        - component_domain_labels
    children:
      - kind: list
        id: domain-categories
        width: narrow
        selection: single
        values:
          - built_in_primitive
          - user_defined_categories
        interactions:
          - click_to_select
          - click_selected_user_category_to_edit_inline
          - drop_domain_to_move_category
        actions:
          - import_category_json
          - export_selected_category_json
      - kind: panel
        id: domain-list
        width: flexible
        children:
          - kind: text-input
            id: domain-search
            behavior: filter_as_you_type
          - kind: list
            id: domains
            row:
              summary:
                - domain_name
                - category
                - type_summary
            interactions:
              - select_to_edit
              - drag_to_attribute_row
      - kind: panel
        id: domain-details
        width: wide
        states:
          unresolved:
            controls:
              - category
              - primitive_type
          single_field:
            controls:
              - primitive_type
              - primitive_parameters
            primitive_type_states:
              code_set:
                controls:
                  - storage_type_select_varchar_decimal_integer
                  - code_name_quick_entry_with_Enter
                  - ordered_code_entries
                entry_controls:
                  - name
                  - value
                interactions:
                  - add_code_name_on_Enter_when_not_ime_composing
                  - edit_name_and_value
                  - drag_to_reorder_code
          multi_field:
            controls:
              - component_name_quick_entry_with_Enter
              - ordered_components
              - per_component_type
              - add_component
              - remove_component
              - drag_to_reorder_component
        actions:
          - assign_to_selected_attribute
          - delete_domain
accessibility:
  - Each pane has a label and keyboard focus order.
  - Category selection filters the list without hiding search state.
  - Domain assignment has a keyboard action equivalent to drag and drop.
constraints:
  - Categories are flat filters, not a containment hierarchy.
  - Domain category changes are performed by dragging a domain row onto a user category; details do not contain a category select.
  - Built-in primitives are displayed as generic domains and are not deleted.
  - Selecting multi_field is always allowed.
  - Undefined domains are assignable while their physical type remains undecided.
  - Empty multi_field domains are assignable while their components remain undecided.
  - Single-field and multi-field domains use the same assignment interaction.
  - Multi-field component names are entered repeatedly with Enter before choosing types.
  - Each component type may remain undefined or select a primitive or single-field domain.
  - A component cannot select a multi-field domain.
  - Assignment stores a data:data-domain reference, not copied type metadata.
  - code_set editing follows requirement:code-set-management and stores data:code-set.
  - code_set is projected as its selected scalar storage type, never as a database-native enum.
  - Name display mode changes domain labels only and preserves definitions and assignments.
```
