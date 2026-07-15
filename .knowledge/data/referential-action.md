---
id: data:referential-action
type: data
title: Referential Action
---

Referential action records the initial SQL ON DELETE behavior of an exported foreign key.

```yaml
field: on_delete
values:
  - no_action
  - restrict
  - cascade
  - set_null
default: no_action
validation:
  - Action applies only when data:relationship exports a foreign key.
  - set_null requires every local foreign-key column to be nullable.
  - cascade is reviewed against policy:deletion-policy and data:data-lifecycle.
deferred:
  - on_update
  - set_default
```
