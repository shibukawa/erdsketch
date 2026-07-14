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
```
