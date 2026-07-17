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
  order:
    key: opposite_endpoint_y
    tie_breaker: flow_id
  goal: avoid_overlapping_lines_at_nodes
lanes:
  vertical:
    separate_by_travel:
      - upward
      - downward
    interval_overlap: allocate_distinct_x
    tie_breaker: flow_id
recalculation:
  required_after:
    - node_move_commit
    - flow_create
    - flow_delete
    - flow_endpoint_change
  during_node_drag:
    endpoint_tracking: required
    crossing_optimization: optional_when_frame_budget_allows
  persistence: derived_not_stored
constraints:
  - A left-to-right flow uses the shortest valid orthogonal route.
  - A right-to-left flow leaves the source right side, routes around the nodes, and enters the destination left side.
  - Right-to-left geometry does not require a bidirectional flow.
  - Bidirectional state is independent of node placement.
  - Incident ports follow opposite endpoint vertical order to reduce crossings near a node.
  - Upward and downward vertical segments use different X lanes.
  - Vertical segments with overlapping Y intervals do not share an X lane when space permits.
  - Parallel or bidirectional flows use distinct offset ports.
  - Routing avoids overlapping connector segments where space permits.
  - Route output is deterministic for unchanged nodes and flows.
  - Drag preview keeps every route attached to its moving endpoint.
  - Committed placement always recalculates all affected routes for crossing reduction.
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
