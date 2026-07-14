---
id: flow:transfer-canvas-model-ownership
type: flow
title: Transfer Canvas Model Ownership
---

```yaml
flow:
  trigger: User confirms ui:canvas-ownership-transfer-dialog.
  preconditions:
    - Model has exactly one owner placement under rule:canvas-model-ownership.
    - Target canvas differs from current owner canvas.
  steps:
    - id: validate
      action: Revalidate current owner and target canvas.
    - id: ensure_target_placement
      action: Reuse the target readonly placement or create data:canvas-model-placement when absent.
    - id: transfer
      action: Atomically change target access_mode to owner and previous owner access_mode to readonly.
    - id: record
      action: Record the transfer through requirement:design-decision-history.
    - id: publish
      action: Refresh ownership and readonly state for all collaborators.
  result:
    owner_canvas_count: one
    previous_owner_access_mode: readonly
    target_access_mode: owner
  failure:
    ownership_changed_concurrently: Reject and show the latest owner before retry.
    target_canvas_removed: Reject and request another target.
```
