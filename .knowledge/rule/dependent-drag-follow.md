---
id: rule:dependent-drag-follow
type: rule
title: Dependent Drag Follow
---

Canvas movement follows dependency direction only.

```yaml
rules:
  when_dragging_dependent:
    movement_set:
      - dragged_dependent_model
      - all_transitively_reachable_independent_models
    traversal:
      edge_direction: dependent_to_independent
      recursive: true
      reverse_edges: excluded
  when_dragging_independent:
    move:
      - dragged_independent_model
    followers: none
  visibility:
    selected_region_only: false
    viewport_only: false
  selection:
    cardinality: one
    followers_need_selection: false
  cycles:
    allowed: true
    rejection_or_warning: none
    traversal_identity: model_id
    process_each_model_once: true
  locking: rule:relationship-move-lock
  undo:
    unit: entire_group_move
    restores_all_moved_models: true
constraints:
  - Relationship dependency direction determines the transitive movement set.
  - Every reachable model moves even when outside selection bounds or viewport.
  - Traversal never follows an independent-to-dependent reverse edge.
  - Cycles require no special domain restriction; identity deduplication keeps traversal finite.
related:
  - data:dependent-entity
  - data:relationship
  - ui:erd-sketch-canvas
  - requirement:relationship-management
  - rule:relationship-move-lock
```
