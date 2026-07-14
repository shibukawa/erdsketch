---
id: data:crud-assignment
type: data
title: Detailed CRUD Assignment
---

CRUD assignment records operations between one stable process unit and one project model.

```yaml
owner: data:project
fields:
  - process_unit_id
  - model_id
  - flow_id
  - operations
process_unit:
  values:
    - data:dfd-process when physical_processes is empty
    - physical member of data:dfd-logical-process
model:
  source: data:model-catalog
operations:
  process_to_model:
    allowed:
      - C
      - U
      - D
    default:
      - C
  model_to_process:
    allowed:
      - R
    default:
      - R
  bidirectional:
    allowed:
      - C
      - R
      - U
      - D
identity:
  unique_by:
    - flow_id
    - process_unit_id
    - model_id
aggregation:
  canvas_connector: union by rule:dfd-model-crud-label
  project_matrix: ui:crud-matrix-view
constraints:
  - Group expansion creates one editable assignment for every process-unit/model pair; non-model data-entity members are excluded.
  - Renaming or reordering a process unit or model preserves its assignment.
  - Flow direction determines which operation checkboxes are available.
```
