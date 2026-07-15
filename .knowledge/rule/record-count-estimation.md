---
id: rule:record-count-estimation
type: rule
title: Record Count Estimation
---

Record count estimation projects retained rows from role-specific volume inputs.

```yaml
common_inputs:
  - initial_record_count
  - projection_horizon
  - data:growth-rate
master:
  rate_meaning: net_record_increase
  formula: ceil(initial_record_count + normalized_rate * horizon)
transaction:
  rate_meaning: inserted_records
  retention: required
  assumption: initial_records_are_uniformly_aged_across_the_retention_window
  existing_survivors: initial_record_count * max(0, 1 - horizon / retention)
  new_survivors: normalized_rate * min(horizon, retention)
  formula: ceil(existing_survivors + new_survivors)
retention:
  source: current_model.data:data-lifecycle.retention_period
  transaction_default: 3_years
  unlimited: forbidden
  units:
    - hour
    - day
    - month
    - year
  conversion:
    month: 30.4375_days
    year: 365.25_days
optional_cap:
  source: maximum_record_count
  effect: minimum_of_projected_count_and_cap
validation:
  - Initial record count is a nonnegative integer.
  - Retention is greater than zero when configured.
  - Transaction retention is always configured.
  - Projection horizon is nonnegative.
constraints:
  - Master and transaction formulas remain separately visible.
  - Summary, history, and work roles require an explicit profile and are deferred from automatic role selection.
  - Rows older than transaction retention are excluded without modeling their destination.
  - Each model is calculated with its own retention period.
```
