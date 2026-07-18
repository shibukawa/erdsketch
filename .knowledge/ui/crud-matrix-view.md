---
id: ui:crud-matrix-view
type: ui
title: Project CRUD Matrix
---

Project CRUD Matrix is the project-wide editor for data:crud-assignment.

```yaml
ui:
  root:
    kind: matrix
    id: project-crud-matrix
    title: CRUD Matrix
    scope: data:project
    axes:
      process_units:
        source:
          - data:dfd-process
          - data:dfd-logical-process physical members
        reorder: drag
      models:
        source: data:model-catalog
        reorder: drag
      orientation:
        options:
          - rows_processes_columns_models
          - rows_models_columns_processes
        mutable: true
    cells:
      source: data:crud-assignment
      controls:
        process_to_model:
          - C
          - U
          - D
        model_to_process:
          - R
        bidirectional:
          - C
          - R
          - U
          - D
      heatmap: rule:crud-matrix-heatmap
    heatmap_controls:
      calculation_basis:
        kind: select
        options:
          - record_count
          - storage_size
        default: record_count
      legend:
        model: white_to_red
        process: white_to_blue
        cell: combined_model_and_process_color
      caution:
        kind: notice
        placement: dialog_above_matrix
        visibility: always_while_heatmap_is_shown
        tone: caution
        message: Heatmap values are only rough indications of SELECT query cost. Actual cost can differ substantially depending on index access, WHERE-clause selectivity, and multi-table join order or loop strategy.
    actions:
      - swap_axes
      - reorder_processes
      - reorder_models
      - edit_operations
      - generate_report
report: requirement:crud-matrix-reporting
constraints:
  - Axis order is project presentation state and does not change model or process identity.
  - Swapping axes transposes presentation without changing assignments.
  - Heatmap colors follow model and process identity after axis swap or reorder.
  - Calculation basis changes presentation only and does not change volume estimates or CRUD assignments.
  - The heatmap caution remains visible in the CRUD Matrix dialog and is not hidden in a tooltip.
```
