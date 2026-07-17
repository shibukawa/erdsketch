---
id: rule:model-maturity-assessment
type: rule
title: Automatic Model Maturity Assessment
---

Model maturity is derived from the least complete applicable condition and is never selected manually.

```yaml
evaluation:
  trigger:
    - model_created
    - model_name_changed
    - model_description_changed
    - attribute_created_or_deleted
    - attribute_name_changed
    - attribute_primary_key_changed
    - attribute_domain_changed
    - domain_name_changed
    - vocabulary_binding_changed
    - data:vocabulary-entry system_name_or_physical_name_changed
  priority:
    - state: seed_model
      when_any:
        - model_name_equals_creation_default
        - model_description_equals_creation_default
        - model_has_no_primary_key_attribute
    - state: conceptual_model
      display_label: Concept
      when_any:
        - attribute_has_no_data:data-domain
    - state: logical_model
      when_any:
        - vocabulary_entry_used_by_model_name_has_empty_system_name
        - vocabulary_entry_used_by_model_name_has_empty_physical_name
        - vocabulary_entry_used_by_attribute_name_has_empty_system_name
        - vocabulary_entry_used_by_attribute_name_has_empty_physical_name
        - vocabulary_entry_used_by_assigned_domain_name_has_empty_system_name
        - vocabulary_entry_used_by_assigned_domain_name_has_empty_physical_name
    - state: matured_model
      when: no_prior_condition_matches
  result:
    state: data:model-state
    roughness: data:model-state.states[state].roughness
    persisted_manual_override: none
scope:
  model_name: model data:vocabulary-binding
  attribute_names: every owned data:attribute data:vocabulary-binding
  domain_names: every data:data-domain assigned to an owned data:attribute
  vocabulary_entry: every matched data:vocabulary-entry segment in each scoped binding
```

Constraints:

- Evaluation stops at the first matching state, so seed conditions override concept and logical conditions.
- An empty attribute list has no primary-key attribute and therefore yields seed_model.
- Every attribute must have a domain before conceptual_model can advance.
- One missing system or physical name in any vocabulary entry used by the scoped names prevents matured_model.
- Recalculation is deterministic and produces no user confirmation.

