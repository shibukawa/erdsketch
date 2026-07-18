---
id: data:ai-review-context
type: data
title: AI Review Context
---

AI review context is a compact JSON projection of the selected modeling scope.

```yaml
root:
  required:
    - formatVersion
    - task
    - project
    - selection
    - models
fields:
  task:
    values:
      - recommend_field_types
      - recommend_model_splits
      - review_model
  project:
    include:
      - id
      - name
  selection:
    include:
      - selected_model_ids
      - selected_attribute_ids
  models:
    include:
      - stable_id
      - names
      - description
      - attributes
      - keys
      - indexes
      - relationships
      - lifecycle
      - volume
      - query_profile
projection:
  source: data:codegen-exchange-model
  serialization: JSON
  deterministic: true
  ui_independent: true
  dependency_closure: selected_scope_only
excluded:
  - canvas_geometry
  - collaboration_presence
  - edit_history
  - unrelated_models
  - provider_credentials
constraints:
  - Include only information needed by the selected advice task.
  - Stable ids allow advice to identify exact targets.
  - formatVersion changes when the prompt-facing contract breaks.
```
