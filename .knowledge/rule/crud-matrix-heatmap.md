---
id: rule:crud-matrix-heatmap
type: rule
title: CRUD Matrix Heatmap
---

CRUD matrix heatmap compares model volume as a rough SELECT-cost indicator without changing data:crud-assignment.

```yaml
scope: ui:crud-matrix-view
interpretation:
  purpose: rough_relative_SELECT_cost_indicator
  query_cost_estimate: false
  limitations:
    - index_access_path
    - WHERE_predicate_selectivity
    - multi_table_join_order_and_loop_strategy
  consequence: actual_SELECT_cost_can_differ_substantially
basis:
  options:
    record_count: data:volume-estimate.estimated_record_count_by_horizon
    storage_size: data:volume-estimate.estimated_total_storage_bytes
  horizon: greatest_configured_projection_horizon
  unit:
    record_count: records
    storage_size: bytes
  default: record_count
model_weight:
  value: selected_basis_value
  score: log10(1 + value)
  normalization: (score - minimum_model_score) / (maximum_model_score - minimum_model_score)
  zero_range: all_model_weights_are_0
  range: [0, 1]
  target: model_name_background
  colors:
    0: "#ffffff"
    1: "#ff9999"
  interpolation: linear_sRGB
process_weight:
  read_models: models whose data:crud-assignment contains R for the process
  value: product_of_selected_basis_values_for_distinct_read_models
  empty_read_set: 0
  zero_member: 0
  score: log10(1 + value)
  stable_positive_score:
    log_product: sum_of_log10_member_values
    formula: log_product + log10(1 + 10 ^ (-log_product))
  normalization: (score - minimum_process_score) / (maximum_process_score - minimum_process_score)
  zero_range: all_process_weights_are_0
  range: [0, 1]
  target: process_name_background
  colors:
    0: "#ffffff"
    1: "#9999ff"
  interpolation: linear_sRGB
display:
  relative_percentage:
    value: round(100 * weight)
    visible_in_matrix: false
    purpose: color_interpolation_only
  model_tooltip:
    targets:
      - model_name
      - every_cell_for_the_model
    values:
      - record_count
      - table_size
    independent_of_selected_basis: true
  process_name_tooltip:
    percentage: hidden
  unavailable: dash
cell_color:
  inputs:
    model: m
    process: p
  formula:
    red: round(255 * (1 - 0.4 * p))
    green: round(255 * (1 - 0.4 * m) * (1 - 0.4 * p))
    blue: round(255 * (1 - 0.4 * m))
  properties:
    model_only_at_1: "#ff9999"
    process_only_at_1: "#9999ff"
    order_independent: true
availability:
  incomplete_or_unknown_model_estimate:
    weight: unavailable
    color: "#ffffff"
    marker: estimate_unavailable
    excluded_from_model_minimum: true
    excluded_from_model_maximum: true
  process_with_unavailable_read_model:
    weight: unavailable
    color: "#ffffff"
    marker: estimate_unavailable
    excluded_from_process_minimum: true
    excluded_from_process_maximum: true
recompute_when:
  - calculation_basis_changes
  - volume_estimate_changes
  - R_assignment_changes
constraints:
  - Normalization is independent for models and processes.
  - Each minimum available score maps to 0 percent and white when the score range is nonzero.
  - Each maximum available score maps to 100 percent when the score range is nonzero.
  - Equal available scores all map to 0 percent and white.
  - Duplicate assignments to the same process/model pair do not multiply the model twice.
  - C, U, and D do not affect process weight.
  - Heatmap state is derived presentation data and is not persisted as CRUD semantics.
  - The dialog always explains that execution details can substantially change actual SELECT cost.
```
