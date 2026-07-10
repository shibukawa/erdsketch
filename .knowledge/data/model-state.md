---
id: data:model-state
type: data
title: Model State
---

Model state names four cumulative refinement levels and their exact Rough.js roughness.

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
    display_label: Conceptual Model
    roughness: 3.5
    guidance:
      - primary_key_attributes_defined
      - favorite_attributes_defined
      - relationships_between_independent_models_configured
  logical_model:
    display_label: Logical Model
    roughness: 1.25
    includes: conceptual_model
    guidance:
      - relationships_for_dependent_models_configured
      - indexes_configured
  matured_model:
    display_label: Matured Model
    roughness: 0.5
    includes: logical_model
    guidance:
      - business_name_configured
      - system_name_configured
guidance_policy:
  cumulative: true
  enforcement: advisory_only
related:
  - data:model-seed
  - data:attribute
  - data:relationship
  - data:dependent-entity
  - requirement:performance-design
  - term:vocabulary
```
