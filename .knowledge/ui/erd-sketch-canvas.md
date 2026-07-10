---
id: ui:erd-sketch-canvas
type: ui
title: ERD Sketch Canvas
---

ERD Sketch canvas is the main workspace, not a separate seed input screen.

Users place model seeds freely like a Miro-style board, then grow them into model elements.

```yaml
ui:
  root:
    kind: canvas
    id: erd-sketch-canvas
    title: ERD Sketch
    primary_item: data:model-seed
    interactions:
      - double_click_to_add_model_seed
      - drag_and_drop_to_move
      - click_title_to_edit
      - click_description_to_edit
      - open_field_list_from_card_menu
      - switch_card_content_from_sidebar
      - inline_rename
      - multi_select
      - pan_canvas
      - zoom_canvas
      - adjust_roughness_slider
      - choose_model_state
      - choose_seed_role
      - choose_seed_dependency
      - toggle_seed_privacy
      - connect_seeds
      - grow_seed_as_entity
      - grow_seed_as_value_object
      - grow_seed_as_data_domain
    visual_language:
      card_renderer: roughjs
      card_shape: roughjs_rectangle
      line_renderer: roughjs_path
      maturity_signal: roughness
      roughness_range:
        min: 0.5
        max: 6.0
        default_on_create: 6.0
        suggested_steps:
          - 0.5
          - 1.25
          - 3.5
          - 6.0
        state_mapping:
          matured_model: 0.5
          logical_model: 1.25
          conceptual_model: 3.5
          seed_model: 6.0
      role_color:
        master: green_reference_tone
        transaction: blue_flow_tone
        summary: yellow_aggregate_tone
        history: violet_time_tone
        work: slate_temporary_tone
      avoid:
        - lane_based_status_layout
        - process_seed_palette
        - external_seed_palette
        - note_seed_palette
        - corner_radius_maturity
        - rough_sketch_label
        - clarified_label
        - linked_text_label
    editing:
      title: click_to_edit
      description: click_to_edit
      role:
        interaction: single_select
        default: transaction
        controls_card_color: true
      dependency:
        interaction: single_select
      privacy:
        interaction: boolean_toggle
      relationship:
        interaction: draw_line_between_models
        not_a_card_tag: true
      fields:
        interaction: ui:field-list-dialog
      model_state:
        interaction: manual_select
        source: data:model-state
        automatic_update: deferred
    card_content:
      control: ui:model-card-display-mode
      modes:
        - description
        - primary_and_important_fields
    viewport:
      pan: drag_empty_space_or_trackpad_scroll
      zoom: trackpad_pinch_or_ctrl_wheel
    persistence:
      format: plain_text
      expected_files:
        - model/seeds/*.seed.yaml
constraints:
  - Canvas is the product's primary surface.
  - Users decide placement and grouping.
  - The app should not mechanically grid seeds.
  - Roughness expresses maturity and sketch state.
  - State and roughness use the exact mapping in data:model-state.
  - State changes are manual; readiness criteria are advisory.
  - New seeds start at maximum roughness.
  - Roughness labels are not displayed on cards.
  - Role, dependency, and privacy are not multi-tag fields.
  - Relationship labels are not seed tags.
  - Linked state should be visible from connections or promoted model references.
related:
  - data:model-seed
  - concept:model-growth
  - requirement:design-decision-history
  - requirement:field-list-management
  - requirement:model-card-field-summary
  - ui:field-list-dialog
  - ui:model-card-display-mode
  - data:model-state
  - requirement:model-state-management
```
