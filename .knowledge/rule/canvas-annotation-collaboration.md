---
id: rule:canvas-annotation-collaboration
type: rule
title: Canvas Annotation Collaboration
---

Concurrent annotation work remains live, attributable, and reversible without one user undoing another user's intent.

```yaml
presence:
  scope: active_canvas
  shows:
    - cursor
    - display_name
    - selection_outline
    - text_edit_owner
sync:
  operations:
    - create
    - update_content
    - update_geometry
    - update_style
    - update_layer
    - delete
  local_feedback: optimistic
  remote_visibility: without_reload
  authority: actor:session-host
  ordering: data:collaboration-message host_sequence
conflict:
  sticky_text:
    policy: single_active_editor
    contention: show_editor_and_keep_readonly
    commit: rule:collaborative-text-commit
  geometry_and_style:
    policy: latest_accepted_operation
    commit: rule:collaborative-edit-commit
  delete:
    policy: wins_and_ends_active_edit
history:
  unit: one_committed_annotation_action_or_text_commit
  undo_scope: initiating_user
  remote_operations: never_removed_by_local_undo
  redo_scope: initiating_user
constraints:
  - A remote update does not cancel the local active tool.
  - Presence state is transient and is not stored as annotation content.
  - Annotation typing stays in a local draft and produces one durable update on commit.
  - Arrow endpoint, move, and resize gestures stay local until pointerup and send no pointermove operations.
  - A multi-stroke pen session stays local across pointer releases and sends one create operation when Done is pressed.
  - Freehand and boundary geometry edits stay local until Confirm and send one update_geometry operation.
  - Pointer cancellation discards annotation geometry previews without changing durable state.
  - Reconnection refreshes current annotations from actor:session-host before accepting new local mutations.
  - system:collaboration-relay transports annotation messages but does not decide conflicts.
```
