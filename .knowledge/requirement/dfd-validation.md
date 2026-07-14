---
id: requirement:dfd-validation
type: requirement
title: DFD Validation
---

```yaml
errors:
  - endpoint_pair_violates_rule:dfd-connection-policy
  - duplicate_non_external_definition_on_canvas
  - standalone_event_node
  - dfd_only_model_placed_on_erd
warnings:
  - unconnected_node
  - process_without_input
  - process_without_output
  - external_entity_direct_model_role_is_not_work
  - group_expansion_is_large
warning_policy:
  blocks_save: false
  report:
    - offending_node_or_flow
    - reason
    - suggested_action
terminal_policy:
  explicit_end_node_required: false
  accepted:
    - node: data:dfd-process
      when: kind_is_ui_and_has_input
      meaning: human_viewing_completes_the_use_case
    - node: data:dfd-intermediate-file
      when: has_input
      meaning: human_reading_may_complete_the_use_case
constraints:
  - Empty data:data-flow label or protocol does not warn.
  - external_entity_direct_model_role_is_not_work applies only to direct external-entity and model flows.
  - process_without_output applies to batch, not UI.
  - Terminal-capable nodes still warn when unconnected.
  - UI without input still raises process_without_input.
```
