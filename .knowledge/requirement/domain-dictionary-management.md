---
id: requirement:domain-dictionary-management
type: requirement
title: Domain Dictionary Management
---

Users rapidly capture domain names, then define and reuse domains in a dedicated workspace.

```yaml
requirements:
  quick_entry:
    interaction: type_domain_name_then_press_Enter
    result: append_domain_and_keep_input_ready
    repeatable: true
    initial_definition_state: unresolved
    initial_primitive_type: undefined
    ime_safe: true
  detailed_editing:
    surface: ui:domain-dictionary-dialog
    interaction: select_domain
    fields:
      - name
      - category
      - definition_state
      - primitive_type
      - primitive_parameters
      - code_set_definition
      - components
  built_in_entries:
    source: data:primitive-type
    generic: true
    category: built_in_primitive
  categories:
    flat: true
    values:
      - built_in_primitive
      - default_user_defined
      - freely_named_user_categories
    rename: click_selected_user_category_then_edit_inline
    move_domain: drag_domain_row_to_user_category
    transfer:
      format: versioned_json
      scope: selected_category_and_its_domains
      actions:
        - import
        - export
  search:
    targets:
      - domain_name
      - component_name
      - primitive_type
      - category_name
  assignment:
    source: ui:domain-dictionary-dialog
    target: data:attribute
    interaction: drag_domain_to_field_row
    result: assign_domain_reference
    eligibility: every_domain
    hover_feedback:
      row: highlighted
      domain_cell: strongly_emphasized
      reorder_indicator: hidden
  consistency:
    authority: domain_definition
    scope: every_assigned_attribute
  composite:
    logical_editing_rows: 1
    physical_projection: rule:domain-expansion
    selection:
      always_available: true
      initial_components: empty_allowed
      assignment: always_allowed
    component_ordering: drag_rows
  code_set:
    definition: data:code-set
    management: requirement:code-set-management
acceptance:
  - Users can enter multiple domain names without reopening an editor.
  - A newly entered domain has undefined type until defined in ui:domain-dictionary-dialog.
  - Undefined domains can be assigned before their physical type is decided.
  - The detailed dialog shows a flat category list, a domain list, and selected-domain details at the same time.
  - Users can select multi_field even when no component domain exists yet.
  - Single-field, multi-field, empty, and undefined domains can all be assigned.
  - User categories can be renamed inline and transferred independently as JSON.
  - UserId can define varchar length 6 and remain consistent across all assignments.
  - CustomerCode can contain TenantId and UserCode components.
  - Dragging any domain onto a field assigns it without copying an independent type definition.
  - A composite assignment remains one row in ui:field-list-dialog.
  - Physical export expands a composite assignment through rule:domain-expansion.
  - Composite primary and foreign keys project through rule:domain-key-projection.
  - Selecting code_set exposes its scalar base type and ordered named-value entries.
```
