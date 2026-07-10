---
id: requirement:performance-design
type: requirement
title: Performance Design
---

The workbench supports AI-assisted performance design from data volume and query information.

```yaml
review_targets:
  - index_candidates
  - partition_candidates
  - summary_candidates
  - cache_candidates
inputs:
  - data:volume-estimate
  - data:query-profile
  - data:relationship
```
