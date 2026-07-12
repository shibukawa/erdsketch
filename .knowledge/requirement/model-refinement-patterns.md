---
id: requirement:model-refinement-patterns
type: requirement
title: Model Refinement Patterns
---

Users evolve rough sketches into usable models through explicit, guided transformations. Unlike compatibility-preserving refactoring, refinement may add or change modeled semantics to realize new capability.

```yaml
scope:
  field_selection:
    - data:extract-master-pattern
    - data:extract-domain-pattern
    - data:create-history-pattern
    - data:multiple-items-pattern
    - data:extract-optional-model-pattern
    - data:extract-one-to-one-pattern
    - data:split-by-code-set-pattern
  model_selection:
    - data:create-work-pattern
application:
  preview_required: true
  atomic: true
  cancel_has_no_effect: true
  records_decision: requirement:design-decision-history
  preserves_unaffected_order: true
  generated_names_must_be_unique: true
  invalid_submission: blocked_with_inline_reason
shared_key_input:
  modes:
    selected_fields:
      minimum: 1
      composite_allowed: true
      source: selected data:attribute items
    new_field:
      fields:
        - name
        - data:data-domain
      reuse: existing field name and domain controls
  exactly_one_mode: true
selection_identity:
  stable_ids_required: true
  reason: names and indexes may change during transformation
```

related:
  - ui:model-refinement-panel
  - data:model-transformation
  - requirement:normalization-support
  - requirement:field-list-management

