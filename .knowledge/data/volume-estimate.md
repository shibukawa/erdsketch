---
id: data:volume-estimate
type: data
title: Volume Estimate
---

Volume estimate records expected growth and storage size for each entity.

```yaml
input_fields:
  - daily_insert_count
  - daily_update_count
  - daily_delete_count
  - average_row_size
  - maximum_row_count
  - retention_period
derived_fields:
  - total_row_count
  - database_size
  - annual_growth
relationship_propagation:
  example:
    relationship: Order 1:N OrderLine
    average_children: 3
    maximum_children: 100
related:
  - data:relationship
  - requirement:performance-design
  - ui:volume-view
```
