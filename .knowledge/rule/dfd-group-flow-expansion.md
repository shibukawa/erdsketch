---
id: rule:dfd-group-flow-expansion
type: rule
title: DFD Group Flow Expansion
---

A connector involving data:dfd-overlap-group represents every valid pair of its member nodes.

```yaml
expansion:
  operation: cartesian_product
  source_members: source group members or source singleton
  destination_members: destination group members or destination singleton
  filter: rule:dfd-connection-policy
  direction: Preserve the visible connector direction for every expanded flow.
shared_flow:
  source: visible group connector
  attributes:
    - data
    - label
    - protocol
    - direction
  apply_to: every expanded flow
example:
  source_processes: 2
  destination_data_entities: 2
  visible_connectors: 1
  semantic_flows: 4
file_group_example:
  source_external_entities: 1
  destination_intermediate_data_nodes: 2
  visible_connectors: 1
  semantic_flows: 2
visual:
  attach_connector_to: dashed_group_boundary
  member_lines: hidden
constraints:
  - Expansion changes presentation only; every expanded pair has normal data:data-flow semantics.
  - Invalid endpoint pairs cannot be made valid by grouping.
  - Editing group membership recalculates the Cartesian product.
  - Individual expanded flows cannot override shared data, label, protocol, or direction while grouped.
  - data:crud-assignment may vary for each expanded process/model pair and physical process unit.
  - rule:dfd-model-crud-label renders the union of those detailed assignments.
  - Separating a group follows rule:dfd-group-flow-restoration.
```
