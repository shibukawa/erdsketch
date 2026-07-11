---
id: rule:relationship-operation-history
type: rule
title: Relationship Operation History
---

History stores primitive changes but executes and reverses one user operation as a group.

```yaml
storage:
  change_granularity: primitive
  examples:
    - relationship_update
    - relationship_reference_update
    - projection_recalculation
    - model_position_update
operation:
  grouping: user_action
  apply: atomic_group
  undo: reverse_entire_group
  redo: reapply_entire_group
  failure: rollback_entire_group
examples:
  cardinality_flip:
    grouped_changes:
      - relationship_multiplicity_update
      - field_list_projection_update
    preserves:
      - relationship_reference_identity
      - primary_key_flag
      - foreign_key_flag
  relationship_delete:
    grouped_changes:
      - relationship_delete
      - relationship_reference_delete
constraints:
  - Users never observe a partially applied operation.
  - Primitive history records do not imply primitive user-facing undo steps.
related:
  - requirement:relationship-management
  - data:relationship
  - data:relationship-reference
  - rule:relationship-move-lock
```
