---
id: requirement:model-state-management
type: requirement
title: Model State Management
---

Users manually control model state; automatic assessment is deferred.

```yaml
current_behavior:
  authority: user_selected_state
  manual_change: allowed
  mapping: data:model-state
  on_state_change:
    set_card_roughness_to_mapped_value: true
  valid_states:
    - seed_model
    - conceptual_model
    - logical_model
    - matured_model
readiness_guidance:
  source: data:model-state
  cumulative: true
  blocks_manual_change: false
  validation: none
future_behavior:
  automatic_state_assessment:
    status: deferred
    decision_required: true
  automatic_state_transition:
    status: deferred
    decision_required: true
acceptance:
  - New models start as seed_model with roughness 6.0.
  - Users can select any state manually.
  - State selection updates visual roughness to the exact mapped value.
  - Missing guidance criteria do not reject a manual state selection.
  - No automatic state update occurs in the current scope.
related:
  - data:model-state
  - data:model-seed
  - ui:erd-sketch-canvas
```
