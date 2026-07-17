---
id: rule:model-seed-labels
type: rule
title: Model Seed Structured Hints
---

Model seed structured hints are compact controls, not free-form status badges.

```yaml
controls:
  role:
    selection: single
    default: transaction
    values:
      - master
      - transaction
      - summary
      - history
      - work
    visual_effect: card_color
  dependency:
    selection: single
    values:
      - value: independent
        display_label: Parent table
      - value: dependent
        display_label: Dependent table
  privacy:
    selection: boolean
    value_when_true: privacy
removed_controls:
  relationship_hint:
    reason: relationships are drawn as model-to-model lines
ui:
  interaction: segmented_buttons_and_toggle
  constraints:
    - Do not show "Linked" as text.
    - Show data:model-state display labels; do not expose numeric roughness as the state name.
    - Do not use relationship tags such as 1:N, N:M, reference, or snapshot on seed cards.
    - Use role, dependency, and privacy to capture modeling hints before promotion.
related:
  - data:model-seed
  - ui:erd-sketch-canvas
```
