---
id: data:dfd-logical-process
type: data
title: DFD Logical Process Presentation
---

DFD logical-process presentation shows physical implementation members inside an existing data:dfd-process.

```yaml
owner: data:dfd-process
activation:
  field: physical_processes
  condition: non_empty
physical_processes:
  item:
    fields:
      - id
      - name
    identity: persistent
  cardinality: one_or_more
visual:
  container: roughjs_predefined_process_with_physical_list
  side_boundaries:
    - inner_left_vertical_line
    - inner_right_vertical_line
  header: process_name
  body: physical_process_list
semantics:
  node_identity: unchanged
  node_type: process
  external_flows_attach_to: process_boundary
  internal_program_integration:
    allowed: true
    rendered_as_dfd_flow: false
constraints:
  - This is not a separate node kind or palette option.
  - Removing all physical-process entries restores the selected batch or UI presentation.
  - Every physical member belongs to the same logical responsibility.
  - A physical member ID remains stable across rename and reorder for data:crud-assignment references.
  - Membership expresses implementation splitting without permitting a direct process-to-process DFD flow.
```
