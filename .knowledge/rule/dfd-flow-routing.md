---
id: rule:dfd-flow-routing
type: rule
title: DFD Flow Routing
---

```yaml
direction:
  arrow_meaning: data_flow_direction
  default: left_to_right
  reverse_only: allowed
  bidirectional: allowed
geometry:
  segments:
    - horizontal
    - vertical
  turns: right_angle
  curves: forbidden
ports:
  distribute_by_side: true
  offset_coordinates: true
  goal: avoid_overlapping_lines_at_nodes
constraints:
  - A left-to-right flow uses the shortest valid orthogonal route.
  - A right-to-left flow leaves the source right side, routes around the nodes, and enters the destination left side.
  - Right-to-left geometry does not require a bidirectional flow.
  - Bidirectional state is independent of node placement.
  - Parallel or bidirectional flows use distinct offset ports.
  - Routing avoids overlapping connector segments where space permits.
render_stability:
  regenerate_only_when:
    - endpoint_geometry_changes
    - flow_geometry_changes
    - selection_style_changes
  preserve_when:
    - cursor_moves
    - unrelated_drag_state_changes
    - unrelated_presence_changes
```
