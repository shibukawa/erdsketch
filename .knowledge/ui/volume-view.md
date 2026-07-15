---
id: ui:volume-view
type: ui
title: Volume View
---

Users enter role-specific volume assumptions and inspect future record and storage estimates.

```yaml
ui:
  root:
    kind: view
    id: volume-view
    entry_points:
      - ui:field-list-dialog
      - selected_model_design_actions
    children:
      - kind: estimate-form
        item: data:volume-estimate
        common_controls:
          - initial_record_count
          - projection_horizons
          - maximum_record_count
        role_controls:
          master:
            - net_growth_amount
            - growth_period_hour_day_month
          transaction:
            - insert_amount
            - growth_period_hour_day_month
            - retention_duration
        retention_binding: selected_model.data:data-lifecycle.retention_period
        transaction_retention:
          required: true
          default: 3_years
          unlimited_option: absent
          editable_per_model: true
      - kind: assumption-panel
        fields:
          - rate_unit_conversions
          - initial_transaction_age_distribution
          - active_overhead_profile
          - missing_field_sizes
      - kind: derived-metric-panel
        fields:
          - estimated_record_count_by_horizon
          - estimated_record_payload_bytes
          - estimated_record_size_bytes
          - estimated_table_bytes
          - estimated_index_bytes
          - estimated_total_storage_bytes
      - kind: projection-chart
        x: projection_horizon
        series:
          - estimated_record_count
          - estimated_total_storage_bytes
validation:
  display: inline
  partial_estimate: allowed_with_warning
constraints:
  - Changing retention updates only the selected model's data:data-lifecycle rather than a duplicate volume field.
  - Opening another model shows that model's independently stored retention.
  - Transaction retention cannot be cleared or set to unlimited.
  - Master and transaction forms use role-specific labels and formulas.
  - Summary, history, and work models require manual profile selection until role formulas are defined.
  - Every metric is visibly labeled as an estimate.
  - Transaction storage includes retained rows only and does not model expired-row destinations.
related:
  - requirement:capacity-estimation
  - rule:record-count-estimation
  - rule:storage-size-estimation
```
