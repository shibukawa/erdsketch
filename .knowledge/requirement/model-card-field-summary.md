---
id: requirement:model-card-field-summary
type: requirement
title: Model Card Field Summary
---

Users switch all model cards between description and key-field summaries from the sidebar.

```yaml
display_modes:
  description:
    card_body: model_description
  key_fields:
    card_body:
      primary_key:
        source: all_primary_key_attributes_in_field_order
        single_key_format: attribute_name
        composite_key_format: "(name_1, name_2)"
        composite_example: "(id, name)"
        line_count: 1
        wrap: false
      favorites:
        source: all_important_non_primary_key_attributes_in_field_order
        render: one_attribute_per_row
        omit: never
        count_limit: none
        overflow_summary: forbidden
      deduplication:
        primary_key_attributes_in_favorites: exclude
      capacity:
        requirement: preserve_all_favorite_rows
        viewport_scroll_allowed: true
control:
  surface: sidebar
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
acceptance:
  - Switching to key-fields replaces descriptions on every visible model card.
  - A composite primary key appears once as one line such as `(id, name)`.
  - Primary-key attributes are not repeated in the remaining favorite rows.
  - Every remaining favorite attribute is rendered without truncating the list or using `+N` summaries.
  - Switching back restores descriptions.
  - Switching name mode preserves the selected description or key-fields mode.
  - The content change is animated unless reduced motion is requested.
related:
  - ui:model-card-display-mode
  - ui:erd-sketch-canvas
  - data:attribute
  - rule:primary-key-favorite
```
