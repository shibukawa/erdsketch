---
id: rule:canvas-model-ownership
type: rule
title: Canvas Model Ownership
---

Canvas ownership communicates the primary responsibility boundary for a model and controls cross-canvas editing.

```yaml
rules:
  placed_model:
    owner_canvas_count: one
    applies_to_roles:
      - master
      - transaction
      - summary
      - history
      - work
  ordinary_non_master_model:
    default_owner_canvas_count: one
    placement_on_other_canvas: readonly
  master_model:
    may_appear_on_multiple_canvases: true
    owner_canvas_count_when_placed: one
    placement_on_other_canvas: readonly
  shared_boundary_model:
    purpose_examples:
      - cross_application_work_table
    may_be_used_by_multiple_canvases: true
    requires_explicit_shared_designation: true
  readonly_placement:
    reads_shared_definition: true
    can_change_local_position: true
    position_change_requires_model_lock: false
    can_change_model_definition: false
    visual_tag: readonly
  ownership_transfer:
    flow: flow:transfer-canvas-model-ownership
    atomic: true
    previous_owner_after_transfer: readonly
    target_after_transfer: owner
    invariant_owner_count_during_commit: one
applies_to: data:canvas-model-placement
```
