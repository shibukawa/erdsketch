---
id: ui:entity-candidate-view
type: ui
title: Entity Candidate View
---

Users grow model seeds on a freeform ERD Sketch canvas.

```yaml
ui:
  root:
    kind: view
    id: entity-candidate-view
    alias: ui:erd-sketch-canvas
    children:
      - kind: freeform-canvas
        id: model-seed-canvas
        item: data:model-seed
        interactions:
          - add_model_seed
          - drag_model_seed
          - select_model_seed
          - edit_model_seed_text
          - connect_model_seeds
          - cluster_model_seeds
        layout_policy: user_spatial_arrangement
        visible_fields:
          - name
          - roughness
          - role
          - dependency
          - privacy
          - linked_model_elements
constraints:
  - Do not start with Process Seed, External Seed, or Note Seed categories.
  - Do not force unsorted, growing, or promoted lanes.
  - User placement is design information.
  - Visual roughness uses Rough.js roughness, not corner radius maturity.
  - Title and description are click-editable.
  - Role and dependency are single-select controls from rule:model-seed-labels.
  - Privacy is a boolean control.
  - Relationships are lines, not card tags.
related:
  - ui:erd-sketch-canvas
  - data:model-seed
  - rule:model-seed-labels
```
