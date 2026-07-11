---
id: rule:relationship-roughness
type: rule
title: Relationship Roughness
---

Relationship rendering maturity is derived equally from both endpoint models.

```yaml
formula: (source_model.roughness + target_model.roughness) / 2
aggregation: arithmetic_mean
inputs:
  - source_model.roughness
  - target_model.roughness
output:
  target: relationship_line.roughness
  persisted: false
recalculation:
  - relationship_created
  - source_model_roughness_changed
  - target_model_roughness_changed
  - relationship_endpoint_changed
precision:
  round_before_render: false
constraints:
  - Both endpoints have equal weight.
  - Relationship roughness is read-only and cannot be edited independently.
  - The result remains within the endpoint roughness range.
related:
  - data:relationship
  - data:model-state
  - ui:relationship-view
  - ui:erd-sketch-canvas
  - requirement:relationship-management
```
