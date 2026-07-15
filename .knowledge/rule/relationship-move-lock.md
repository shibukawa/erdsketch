---
id: rule:relationship-move-lock
type: rule
title: Relationship Move Lock
---

A relationship-following drag is an atomic collaborative movement operation.

```yaml
lock_protocol:
  authority: actor:session-host
  before_movement:
    compute: complete_rule:dependent-drag-follow_movement_set
    acquire_lock_for: every_model_in_movement_set
    acquisition: all_or_nothing
  success:
    allow_drag: true
    lock_scope_includes:
      - offscreen_models
      - models_outside_selection_bounds
    release_after:
      - movement_commit
      - movement_cancel
  failure:
    allow_drag: false
    position_changes: none
    release_partial_acquisitions: true
    user_feedback: movement_blocked_because_related_models_could_not_be_locked
  concurrent_graph_change:
    requirement: movement_set_must_remain_stable_while_locked
  transport:
    message: data:collaboration-message
    relay: system:collaboration-relay
undo:
  command_count: one
  scope: every_moved_model
  atomic: true
  history: rule:relationship-operation-history
related:
  - rule:dependent-drag-follow
  - ui:erd-sketch-canvas
  - requirement:relationship-management
  - rule:relationship-operation-history
```
