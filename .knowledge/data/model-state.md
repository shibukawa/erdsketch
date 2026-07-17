---
id: data:model-state
type: data
title: Model State
---

Model state names four automatically assessed refinement levels and their exact Rough.js roughness.

```yaml
order:
  - seed_model
  - conceptual_model
  - logical_model
  - matured_model
default: seed_model
states:
  seed_model:
    display_label: Seed Model
    roughness: 6.0
    guidance:
      - initial_state
  conceptual_model:
    display_label: Concept
    roughness: 3.5
  logical_model:
    display_label: Logical Model
    roughness: 1.25
    includes: conceptual_model
  matured_model:
    display_label: Matured Model
    roughness: 0.5
    includes: logical_model
assessment: rule:model-maturity-assessment
authority: derived_only
manual_change: false
related:
  - data:model-seed
  - data:attribute
  - data:relationship
  - data:dependent-entity
  - requirement:performance-design
  - term:vocabulary
  - rule:model-maturity-assessment
```
