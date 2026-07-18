---
id: requirement:ai-review
type: requirement
title: AI Review
---

AI recommends relevant design knowledge and reviews model quality without replacing human thinking.

```yaml
experience_principles:
  - avoid_exam_like_questioning
  - show_design_ideas_before_demanding_fields
  - present_options_as_inspiration
  - make_human_feel_like_they_discovered_the_idea
review_areas:
  type_selection:
    checks:
      - recommend_primitive_or_domain_type
      - explain_size_precision_and_nullability_tradeoffs
  normalization:
    checks:
      - detect_multivalued_attributes
      - detect_duplicate_attributes
      - suggest_model_split
  lifecycle:
    checks:
      - detect_retention_conflicts
      - compare_deletion_policy_and_foreign_keys
  performance:
    checks:
      - suggest_partition_from_volume
      - detect_missing_indexes
  storage:
    checks:
      - suggest_olap_projection
      - suggest_summary
  pattern_discovery:
    checks:
      - suggest_patterns_from_terms
      - explain_tradeoffs
      - show_alternatives
  transformation:
    checks:
      - detect_repeated_field_for_one_to_many
      - preserve_dependent_entity_semantics
      - warn_when_sql_loses_design_intent
  data_flow:
    checks:
      - suggest_system_boundary_patterns
      - detect_master_distribution_choice
      - suggest_reference_implementation
  correction:
    checks:
      - suggest_correction_pattern
      - suggest_reconciliation_pattern
inputs:
  - concept:assistive-ai-experience
  - concept:design-pattern-catalog
  - concept:intent-based-navigation
  - requirement:normalization-support
  - data:data-lifecycle
  - policy:deletion-policy
  - data:volume-estimate
  - data:query-profile
  - data:concept-projection
  - data:model-transformation
  - data:dependent-entity
  - data:system-boundary-pattern
  - data:reference-implementation
  - data:snapshot-reference
  - data:correction-pattern
  - data:reconciliation-pattern
delivery:
  initial: flow:request-ai-design-advice
  future_change_application: requirement:ai-assisted-model-change
```
