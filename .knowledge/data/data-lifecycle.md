---
id: data:data-lifecycle
type: data
title: Data Lifecycle
---

Data lifecycle defines creation, update, deletion, retention, archive, and purge rules for an entity.

```yaml
fields:
  - creation_trigger
  - update_allowed_until
  - deletion_rule
  - retention_period
  - archive_rule
  - purge_rule
examples:
  creation_trigger: Order confirmed
  update_allowed_until: before shipment
  deletion_rule: deletion prohibited
  retention_period: 7 years
  archive_rule: after 3 years
  purge_rule: after 7 years
related:
  - policy:deletion-policy
  - data:state-transition
  - ui:lifecycle-view
```
