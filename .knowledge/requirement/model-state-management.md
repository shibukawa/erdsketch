---
id: requirement:model-state-management
type: requirement
title: Model State Management
---

The application automatically derives model state and matching roughness from model completeness.

```yaml
current_behavior:
  authority: rule:model-maturity-assessment
  manual_change: forbidden
  mapping: data:model-state
  on_assessment_change:
    set_card_roughness_to_mapped_value: true
  valid_states:
    - seed_model
    - conceptual_model
    - logical_model
    - matured_model
validation: requirement:erd-maturity-validation
acceptance:
  - New models assess as seed_model with roughness 6.0.
  - Users cannot select or override model state.
  - Relevant edits immediately reassess state and set exact mapped roughness.
  - Validation lists every concrete item required for the next state.
related:
  - data:model-state
  - data:model-seed
  - ui:erd-sketch-canvas
  - rule:model-maturity-assessment
  - requirement:erd-maturity-validation
```
