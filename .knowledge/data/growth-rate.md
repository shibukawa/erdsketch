---
id: data:growth-rate
type: data
title: Growth Rate
---

Growth rate stores an expected record increase over one selectable planning period.

```yaml
fields:
  - amount
  - period
amount:
  type: nonnegative_number
period:
  values:
    - hour
    - day
    - month
normalization:
  hour: 1_hour
  day: 24_hours
  month: 30.4375_days
constraints:
  - The original amount and period are preserved for presentation.
  - Conversion assumptions are visible beside derived estimates.
```
