---
id: concept:model-growth
type: concept
title: Model Growth
---

Models grow from rough business knowledge into logical and physical models.

```yaml
growth_path:
  - model_seeds
  - spatial_arrangement
  - rough_relationships
  - business_concepts
  - entity_candidates
  - patterns
  - logical_model
  - physical_model
  - ddl
  - database
  - running_system
refinement_actions:
  - place_model_seed
  - drag_model_seed
  - cluster_model_seeds
  - add_attributes
  - transform_field_to_one_to_many
  - extract_value_objects
  - assign_data_domains
  - normalize_structures
  - organize_relationships
  - select_design_patterns
  - project_to_storage
rule: Every change is saved through requirement:design-decision-history.
inputs_not_starting_points:
  - existing_ui
  - existing_api
  - existing_sql
  - existing_schema
related:
  - ui:erd-sketch-canvas
  - data:model-seed
  - data:model-transformation
```
