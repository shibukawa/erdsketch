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
      - quick_create_model_seed
      - double_click_to_add_model_seed
      - drag_and_drop_to_move
      - click_title_to_edit
      - click_description_to_edit
      - open_field_list_from_card_menu
      - switch_card_content_from_sidebar
      - inline_rename
      - single_select
      - pan_canvas
      - zoom_canvas
      - adjust_roughness_slider
      - choose_model_state
      - choose_seed_role
      - choose_seed_dependency
      - toggle_seed_privacy
      - connect_seeds
      - drag_chain_handle_to_connect_models
      - grow_seed_as_entity
      - grow_seed_as_value_object
      - grow_seed_as_data_domain
      - open_canvas_selector
      - place_existing_project_model
      - create_and_edit_shared_annotations
    quick_create: ui:modeling-quick-create
    link_handle: ui:diagram-link-handle
    annotation_toolbar: ui:canvas-annotation-toolbar
    visual_language:
      card_renderer: roughjs
      card_shape: roughjs_rectangle
      line_renderer: roughjs_path
      relationship_line_roughness: rule:relationship-roughness
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
      placement:
        preview: gesture_local
        commit: rule:collaborative-edit-commit
      title:
        interaction: click_to_edit
        commit: rule:collaborative-text-commit
      description:
        interaction: click_to_edit
        commit: rule:collaborative-text-commit
      role:
        interaction: single_select
        default: transaction
        controls_card_color: true
      dependency:
        interaction: single_select
      privacy:
        interaction: boolean_toggle
      relationship:
        interaction: ui:relationship-view
        not_a_card_tag: true
      fields:
        interaction: ui:field-list-dialog
      model_state:
        interaction: manual_select
        source: data:model-state
        automatic_update: deferred
      maturity_slider:
        preview: component_local
        commit: rule:collaborative-edit-commit
    card_content:
      control: ui:model-card-display-mode
      modes:
        - description
        - primary_and_important_fields
    viewport:
      pan: drag_empty_space_or_trackpad_scroll
      zoom: trackpad_pinch_or_ctrl_wheel
    persistence:
      owner: data:project
      cardinality_per_project: many
      model_definitions: data:model-catalog
      model_placements: data:canvas-model-placement
      annotations: data:canvas-annotation
      format: plain_text
      expected_files:
        - model/seeds/*.seed.yaml
constraints:
  - Canvas is the product's primary surface.
  - A project may own multiple ERD canvases.
  - Each ERD canvas uses the project domain dictionary and vocabulary.
  - Each ERD canvas uses the project model catalog.
  - Cross-canvas model editing follows rule:canvas-model-ownership.
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
  - Relationship lines keep the existing soft curved geometry.
  - Relationship line roughness is the arithmetic mean of both endpoint model roughness values.
  - Relationship endpoint multiplicity uses UML notation, not ERD notation.
  - Model selection contains at most one model.
  - Dragging a dependent model moves all transitively reachable independent models, including offscreen models; reverse dependency direction does not follow.
  - A group drag starts only after every model in its movement set is locked.
  - A group drag is one atomic undo unit.
  - Model placement is updated locally and synchronized only when its drag ends.
  - Shared visual annotations follow requirement:collaborative-canvas-annotation.
  - Remote text-edit presence shows an editor name and animated pencil without transmitting draft characters.
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
  - requirement:relationship-management
  - rule:dependent-drag-follow
  - rule:relationship-move-lock
  - rule:relationship-roughness
  - requirement:collaborative-canvas-annotation
```
