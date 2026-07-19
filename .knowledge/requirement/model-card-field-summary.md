---
id: requirement:model-card-field-summary
type: requirement
title: Model Card Field Summary
---

Users switch all model cards between description and key-field summaries from a bottom-left canvas speed dial.

```yaml
display_modes:
  description:
    card_body: model_description
  key_fields:
    card_body:
      primary_key:
        source: all_primary_key_attributes_in_field_order
        render: one_attribute_per_row
      favorites:
        source: all_important_non_primary_key_attributes_in_field_order
        render: one_attribute_per_row
        omit: never
        count_limit: none
        overflow_summary: forbidden
      deduplication:
        primary_key_attributes_in_favorites: exclude
      row_metadata:
        business_name: assigned_domain_business_name
        system_name: assigned_domain_system_name
        physical_name: resolved_underlying_primitive_type
        missing_domain:
          label: Domain missing
          treatment: orange_wavy_underline
        unresolved_physical_type:
          label: Type unresolved
          treatment: orange_wavy_underline
      capacity:
        requirement: preserve_all_favorite_rows
        viewport_scroll_allowed: true
control:
  surface: ui:model-card-display-mode content_speed_dial
  scope: canvas_view
  interaction: explicit_mode_switch
  default: description
name_display:
  control: ui:model-card-display-mode
  scope: canvas_view
  modes:
    - business_name
    - system_name
    - physical_name
  independent_of_content_mode: true
transition:
  required: true
  properties:
    - opacity
    - small_vertical_motion
  preserve_card_position: true
  avoid_layout_jump: true
accessibility:
  - Respect reduced-motion preference.
  - Do not rely on color alone for field flags.
  - Missing domain and type warnings include text in addition to the orange underline.
acceptance:
  - Content and identifier controls are adjacent FAB speed dials at the canvas bottom-left.
  - Each speed dial opens labeled choices upward and closes after selection.
  - Switching to key-fields replaces descriptions on every visible model card.
  - Each primary-key attribute appears once in field order.
  - Primary-key attributes are not repeated in the remaining favorite rows.
  - Every remaining favorite attribute is rendered without truncating the list or using `+N` summaries.
  - Business and system name modes show each key field's assigned domain in the same name mode.
  - Physical name mode shows each key field's resolved underlying primitive type.
  - Missing domains and unresolved physical types use an explicit orange-underlined warning.
  - Switching back restores descriptions.
  - Switching name mode preserves the selected description or key-fields mode.
  - The content change is animated unless reduced motion is requested.
related:
  - ui:model-card-display-mode
  - ui:erd-sketch-canvas
  - data:attribute
  - rule:primary-key-favorite
```
