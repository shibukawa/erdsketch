---
id: data:query-profile
type: data
title: Query Profile
---

Query profile records important application and analytical queries.

```yaml
fields:
  - name
  - frequency
  - sla
  - joins
  - filters
  - sorts
  - aggregations
example:
  name: Order search
  filters:
    - Customer
    - Date
    - Status
  sorts:
    - Date
related:
  - requirement:performance-design
```
