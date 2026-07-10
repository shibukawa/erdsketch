---
id: policy:deletion-policy
type: policy
title: Deletion Policy
---

Deletion policy defines how records may be deleted or invalidated.

```yaml
methods:
  - deletion_prohibited
  - logical_delete
  - physical_delete
  - physical_delete_after_archive
  - anonymization
  - invalidation
fields:
  - deletion_condition
  - retention_period
  - cascade
checks:
  - Compare cascade behavior with data:relationship.
  - Compare retention with data:data-lifecycle.
```
