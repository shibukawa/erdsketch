---
id: data:data-lifecycle
type: data
title: Data Lifecycle
---

Data lifecycle defines creation, update, deletion, retention, archive, and purge rules for one model.

```yaml
ownership:
  scope: model_definition
  cardinality: one_per_model
  shared_across_models: false
fields:
  - creation_trigger
  - update_allowed_until
  - deletion_rule
  - retention_period
  - archive_rule
  - purge_rule
role_defaults:
  transaction:
    retention_period: 3_years
    retention_required: true
    unlimited_retention: forbidden
    applied_when: transaction_model_is_created_or_first_configured
    editable_per_model: true
examples:
  creation_trigger: Order confirmed
  update_allowed_until: before shipment
  deletion_rule: deletion prohibited
  retention_period: 7 years
  archive_rule: after 3 years
  purge_rule: after 7 years
constraints:
  - Capacity estimation excludes transaction rows after retention without modeling their destination.
  - Changing one model's retention never changes another model's lifecycle.
related:
  - policy:deletion-policy
  - data:state-transition
  - ui:lifecycle-view
```
