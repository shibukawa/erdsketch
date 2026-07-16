---
id: rule:collaborative-text-commit
type: rule
title: Collaborative Text Commit
---

Collaborative text fields isolate unfinished typing from host-authoritative model state.

This rule specializes rule:collaborative-edit-commit for textual content.

```yaml
applies_to:
  - inline_model_title
  - inline_model_description
  - annotation_text
  - dfd_node_title
  - dfd_node_description
  - dfd_flow_label
  - dfd_flow_protocol
  - dfd_physical_processes
  - domain_dictionary_text
  - field_definition_text
  - code_set_entry_text
editing:
  draft: component_local
  durable_state_change: none_until_commit
  presence:
    fields:
      - editor_id
      - target_kind
      - target_id
    remote_ui: animated_pencil_with_editor_name
commit:
  triggers:
    - blur
    - title_enter
    - explicit_dialog_save
  operation_count: one_per_changed_commit
  order:
    - apply_draft_to_local_model
    - send_operation_intent
cancel:
  escape: restore_last_host_confirmed_value
constraints:
  - Host snapshots and presence acknowledgements never replace an active local draft.
  - Draft characters are not transmitted as durable operations.
  - Remote users retain the last committed value until commit succeeds.
  - Reduced-motion preference disables pencil movement without hiding edit ownership.
```
