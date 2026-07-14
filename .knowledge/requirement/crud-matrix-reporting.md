---
id: requirement:crud-matrix-reporting
type: requirement
title: CRUD Matrix Reporting
---

The project can generate a CRUD Matrix report from detailed DFD assignments.

```yaml
source: data:crud-assignment
editor: ui:crud-matrix-view
scope:
  processes: all project process units
  models: all project model definitions
output:
  name: CRUD Matrix report
  rows_and_columns: use current matrix orientation and ordering
  cell_value: ordered union of C, R, U, and D
requirements:
  - The user can choose processes or models as rows.
  - The user can drag to reorder process units independently from models.
  - The report preserves the selected axis orientation and both orders.
  - Detailed assignments remain the source of truth; report cells are derived.
  - A process/model pair without an assignment renders an empty cell.
```
