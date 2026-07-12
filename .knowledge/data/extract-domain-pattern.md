---
id: data:extract-domain-pattern
type: data
title: Extract New Domain Pattern
---

Replace one or more similar attributes with a reusable single- or multi-component domain.

```yaml
description: Convert selected fields and checked similar field groups into one domain assignment.
preconditions:
  context: ui:field-list-dialog
  selected_attributes_minimum: 1
  relationship_references_allowed: false
inputs:
  - domain_name
  - ordered_component_names
  - checked_similar_models
similar_candidates:
  includes:
    - close_edit_distance
    - partial_match_against_multiple_selected_names
  display:
    - model_name
    - matched_field_names
  source_model:
    checked: true
    locked: true
actions:
  - create data:data-domain using ordered_component_names
  - for each checked model remove the matched attributes
  - insert one domain-backed attribute at the lowest removed attribute index
  - set use_domain_name true on each inserted attribute
constraints:
  - Candidate discovery never changes data until apply.
  - Each checked model must contain a complete, unambiguous match for the chosen components.
  - Non-matched attributes retain relative order.
```

related:
  - requirement:model-refinement-patterns
  - data:data-domain
  - data:attribute
  - rule:domain-expansion

