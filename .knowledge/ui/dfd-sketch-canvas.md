---
id: ui:dfd-sketch-canvas
type: ui
title: DFD Sketch Canvas
---

```yaml
ui:
  root:
    kind: canvas
    id: dfd-sketch-canvas
    title: Data Flow
    interactions:
      - quick_create_node
      - search_project_models
      - open_dfd_model_picker
      - place_selected_project_model
      - drag_link_handle_to_connect_nodes
      - select_intermediate_data_when_connecting_processes
      - select_or_create_process_when_connecting_data_entities
      - edit_node_variant
      - edit_physical_processes
      - edit_detailed_crud_assignments
      - open_field_list_from_selected_model_menu
      - overlap_same_class_nodes_to_group
      - separate_group_member_using_rule:dfd-group-flow-restoration
      - open_canvas_selector
      - pan_canvas
      - zoom_canvas
      - center_visible_dfd_content
      - create_and_edit_shared_annotations
      - switch_card_content_from_bottom_left_speed_dial
    quick_create: ui:modeling-quick-create
    palette:
      selection: radio
      options:
        batch: roughjs_predefined_process
        ui: roughjs_predefined_process
        model: roughjs_vertical_cylinder_with_surface_seams
        file: roughjs_folded_file_with_crease
        queue: roughjs_horizontal_cylinder_with_cap_seam
        external: roughjs_closed_pentagon
      overlap_group: dashed_rounded_boundary
    node_editor:
      placement:
        preview: gesture_local
        commit: rule:collaborative-edit-commit
      process_variant:
        options:
          - batch
          - ui
        mutable: true
      intermediate_variant:
        options:
          - file
          - queue
        mutable: true
      physical_processes:
        source: data:dfd-logical-process
        interaction: edit_list
        commit: rule:collaborative-text-commit
      model_fields:
        trigger: hamburger_like_icon_on_selected_model
        interaction: ui:field-list-dialog
        definition: data:model-catalog
    flow_editor:
      label: optional_free_text
      protocol: optional_free_text
      text_commit: rule:collaborative-text-commit
      semantics: rule:dfd-flow-semantics
      model_crud: rule:dfd-model-crud-label
      crud_detail:
        source: data:crud-assignment
        control: directional_matrix
        rows: expanded left endpoint process units or models
        columns: expanded right endpoint process units or models
        process_to_model_cell:
          checkboxes:
            - C
            - U
            - D
          default:
            - C
        model_to_process_cell:
          checkboxes:
            - R
          default:
            - R
        canvas_value: union
    model_scope: rule:dfd-model-scope
    model_picker: ui:dfd-model-picker-dialog
    guidance: ui:dfd-daily-tips
    card_content_control: ui:model-card-display-mode
    viewport_controls: ui:canvas-floating-controls
    validation: requirement:dfd-validation
    connector: rule:dfd-flow-routing
    visual_language: rule:dfd-rough-rendering
    link_handle: ui:diagram-link-handle
    annotation_toolbar: ui:canvas-annotation-toolbar
    ai_assistant: ui:canvas-ai-chat-button
    persistence:
      owner: data:project
      cardinality_per_project: many
      canvas: data:dfd-canvas
      placements: data:dfd-node-placement
      annotations: data:canvas-annotation
constraints:
  - Keep creation and placement interactions compact.
  - Node creation does not open one dialog per node.
  - Logical process is a presentation of data:dfd-process with physical-process entries, not a palette option or distinct node.
  - All process variants use the same predefined-process flowchart outline with double vertical side boundaries.
  - Process-to-model flows may be created directly.
  - Process-to-process connection selects and inserts data:dfd-intermediate-data.
  - Data-entity-to-data-entity connection selects or creates a process and inserts it between the entities.
  - Internal program integration is represented by physical-process entries on data:dfd-process, not a direct DFD flow.
  - Overlapping same-class process nodes or data entities creates data:dfd-overlap-group.
  - Intermediate-data nodes are eligible data-entity group members.
  - External entities connect directly to processes, models, and intermediate data.
  - Process, model, and intermediate-data definitions appear once per canvas.
  - The same external-entity definition may appear more than once per canvas.
  - A group connector follows rule:dfd-group-flow-expansion.
  - Separating a group follows rule:dfd-group-flow-restoration.
  - CRUD text appears only beside a model endpoint and follows rule:dfd-model-crud-label.
  - Group members and physical process members retain independent data:crud-assignment values.
  - Models are shared through data:model-catalog.
  - Model placement uses ui:dfd-model-picker-dialog.
  - A DFD model placement exposes the same field editor and data as its ERD placement.
  - DFD card content is selected from the bottom-left canvas FAB, not the sidebar.
  - The center viewport action clears unintended internal canvas scroll, then uses the bounding box of visible nodes and group boundaries; it never resets non-empty content to a fixed origin coordinate.
  - Shared visual annotations follow requirement:collaborative-canvas-annotation.
  - DFD node movement and continuous inspector controls synchronize only after user confirmation under rule:collaborative-edit-commit.
  - Unchanged data-flow geometry retains the same rendered rough path during cursor movement and unrelated drag updates.
```
