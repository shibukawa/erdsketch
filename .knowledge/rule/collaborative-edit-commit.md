---
id: rule:collaborative-edit-commit
type: rule
title: Collaborative Edit Commit
---

Collaborative editing separates unfinished local previews from durable host-authoritative state.

```yaml
applies_to:
  continuous_gestures:
    - erd_model_drag
    - dfd_node_drag
    - annotation_draw
    - annotation_move
    - annotation_resize
  continuous_controls:
    - text_input
    - textarea
    - numeric_input
    - range_slider
editing:
  draft: component_or_gesture_local
  shared_model_change: none_until_commit
  remote_visibility:
    durable_value: last_host_confirmed_value
    transient_presence: allowed
commit:
  gestures:
    - pointerup
  controls:
    - blur
    - enter_for_single_line_text
    - explicit_save
    - range_pointerup
  operation_count: one_per_changed_record_at_commit
  order:
    - apply_confirmed_draft_to_local_model
    - send_operation_intent
cancel:
  pointercancel: discard_preview
  escape: restore_last_host_confirmed_value
discrete_controls:
  examples:
    - select
    - checkbox
    - toggle
    - action_button
  commit: activation_itself
constraints:
  - Pointermove and keystroke events never mutate durable collaborative state.
  - Host snapshots and acknowledgements never replace an active local draft.
  - Drag previews render from gesture-local geometry.
  - Undo history records one confirmed gesture or control commit.
  - Transient cursor, selection, lock, and edit-owner presence may remain live.
```
