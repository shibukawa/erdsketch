---
id: requirement:erd-maturity-validation
type: requirement
title: ERD Maturity Validation
---

The ERD sidebar explains the current automatic maturity and identifies every concrete change required for the next state.

```yaml
source: rule:model-maturity-assessment
surface: ui:erd-model-sidebar
scope: selected_model
presentation:
  current_state: data:model-state
  target: next_state_only
  diagnostics: ordered_list
  each_item:
    - stable_item_id
    - model_or_attribute_or_domain_label
    - missing_or_default_setting
    - suggested_action
diagnostics_by_current_state:
  seed_model:
    target: conceptual_model
    list_all:
      - default_model_name
      - default_model_description
      - missing_primary_key_for_model
  conceptual_model:
    target: logical_model
    list_all:
      - each_attribute_without_domain
  logical_model:
    target: matured_model
    list_all:
      - each_model_name_vocabulary_entry_missing_system_name
      - each_model_name_vocabulary_entry_missing_physical_name
      - each_attribute_name_vocabulary_entry_missing_system_name
      - each_attribute_name_vocabulary_entry_missing_physical_name
      - each_assigned_domain_name_vocabulary_entry_missing_system_name
      - each_assigned_domain_name_vocabulary_entry_missing_physical_name
  matured_model:
    target: none
    success: maturity_complete
update: live_after_reassessment
navigation:
  model_issue: focus_model_editor
  attribute_issue: open ui:field-list-dialog and focus attribute
  domain_issue: open ui:domain-dictionary-dialog and focus domain
  vocabulary_issue: open ui:vocabulary-view and focus entry
warning_policy:
  blocks_edit: false
  blocks_save: false
```

Constraints:

- Diagnostics name each affected model, attribute, domain, and vocabulary entry; aggregate counts alone are insufficient.
- The list contains all unmet conditions for the next state, including simultaneous conditions.
- Diagnostics follow requirement:dfd-validation presentation style without reusing DFD semantics.
