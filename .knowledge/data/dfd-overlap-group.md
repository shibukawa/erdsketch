---
id: data:dfd-overlap-group
type: data
title: DFD Overlap Group
---

DFD overlap group compresses repeated lines by presenting overlapping same-class nodes as one connection boundary.

```yaml
fields:
  - id
  - canvas_id
  - member_class
  - member_placements
member_class:
  values:
    - process
    - data_entity
membership:
  minimum: 2
  homogeneous: true
creation:
  trigger: Drop one eligible node so it overlaps another eligible node of the same class.
  result: Create a dashed boundary around both placements.
visual:
  boundary: dashed_rounded_rectangle
  preserve_member_shapes: true
constraints:
  - Process class accepts data:dfd-process placements, including their logical-process presentation.
  - Data-entity class accepts data:model-catalog and data:dfd-intermediate-data placements.
  - Multiple intermediate-data nodes between processes may share one dashed data-entity group.
  - Grouping does not merge or copy member definitions.
  - Removing a member preserves its definition and remaining flows.
```
