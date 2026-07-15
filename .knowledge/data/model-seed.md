---
id: data:model-seed
type: data
title: Model Seed
---

Model seed is a rough model idea placed on the ERD Sketch canvas.

It is the primary starting material for ERD Sketch. Process, external, and note seed classes are not first-class entry categories for the model-focused canvas.

```yaml
fields:
  - name
  - text
  - position
  - roughness
  - state
  - role
  - dependency
  - privacy
  - usage_scope
  - linked_entities
  - linked_attributes
  - linked_relationships
  - source_notes
  - business_name
  - system_name
  - sql_table_projections
  - volume_estimate
  - lifecycle
state:
  type: reference
  target: data:model-state
  default: seed_model
  manual_change: true
position:
  x: number
  y: number
visual_style:
  renderer: roughjs
  roughness:
    min: 0.5
    max: 6.0
    default_on_create: 6.0
    control: slider
    suggested_steps:
      - 0.5
      - 1.25
      - 3.5
      - 6.0
    state_mapping: data:model-state
  roughness_representation:
    - roughjs_rectangle
    - roughjs_path_for_links
    - roughjs_stroke_jitter
    - light_fill
not_used_for_maturity:
  - corner_radius_progression
  - visible_roughness_label
  - linked_text_label
editable_text:
  title:
    interaction: click_to_edit
  description:
    interaction: click_to_edit
role:
  selection: single
  default: transaction
  values:
    - master
    - transaction
    - summary
    - history
    - work
  card_color_changes_by_role: true
dependency:
  selection: single
  values:
    - independent
    - dependent
privacy:
  type: boolean
  meaning: contains_personal_information
usage_scope:
  type: enum
  values:
    - shared
    - dfd_only
  default: shared
  rule: rule:dfd-model-scope
relationship_hint:
  status: removed_from_seed_tags
  representation: model_to_model_line
constraints:
  - Only model seeds are placed by default.
  - Spatial placement is user-authored meaning.
  - Seed can later promote to data:entity, data:value-object, or data:data-domain.
  - Role and dependency are controlled single-select fields.
  - Privacy is an on/off flag only.
  - Relationship semantics are expressed by lines between model seeds, not seed tags.
  - Linked state is shown visually through lines or model references, not a "Linked" text label.
  - Every DFD placement of this model uses the same roughness and data:model-state as its ERD placement.
related:
  - ui:erd-sketch-canvas
  - data:model-state
  - requirement:model-state-management
  - data:entity
  - data:value-object
  - data:data-domain
  - data:sql-table-projection
  - data:volume-estimate
  - data:data-lifecycle
```
