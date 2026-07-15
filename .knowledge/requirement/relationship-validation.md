---
id: requirement:relationship-validation
type: requirement
title: Relationship Validation Inventory
---

Relationship validation is planned separately from relationship editing implementation.

```yaml
status: inventory_for_later_design
hard_integrity_errors:
  - relationship_endpoint_model_missing
  - relationship_reference_target_missing
  - duplicate_relationship_reference_for_relationship
  - persisted_projection_record_shape_invalid
  - relationship_reference_flags_not_boolean
  - unsupported_persisted_multiplicity
  - unsupported_persisted_reading_direction
  - partial_relationship_operation_persisted
semantic_validation_candidates:
  - relationship_name_empty
  - relationship_name_conflicts_with_attribute_or_other_export_name
  - multiplicity_pair_not_supported
  - one_to_one_projection_side_not_resolvable_from_arrow
  - projection_visibility_disagrees_with_multiplicity_or_arrow
  - primary_key_reference_has_no_resolvable_target_identity
  - foreign_key_reference_has_no_resolvable_target_key
  - composite_key_arity_or_type_mismatch
  - incomplete_domain_prevents_physical_key_projection
  - many_to_many_join_name_conflict
  - generated_identifier_invalid_for_export_target
  - cyclic_foreign_key_not_supported_by_export_target
  - foreign_key_target_is_non_primary_composite_candidate_key
  - set_null_action_targets_non_nullable_local_column
  - cascade_action_conflicts_with_deletion_policy_or_lifecycle
classification_to_decide_later:
  - blocking_error
  - warning
  - export_only_error
integrity_policy:
  persisted_data_inconsistency: error
  silent_repair: forbidden
  partial_load: forbidden_for_affected_model_graph
  report:
    - offending_record_id
    - violated_invariant
    - affected_relationship_and_models
related:
  - data:relationship
  - data:relationship-reference
  - requirement:relationship-management
  - rule:domain-key-projection
```
