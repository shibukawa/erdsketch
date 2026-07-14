---
id: data:dfd-external-entity
type: data
title: DFD External Entity
---

DFD external entity is a person, organization, or system outside the modeled process boundary.

```yaml
fields:
  - id
  - name
  - description
shape: roughjs_closed_pentagon
outline:
  diagonal_segments: complete
  stroke_weight: uniform_with_other_dfd_nodes
canvas: data:dfd-canvas
placement:
  record: data:dfd-node-placement
  occurrences_per_canvas: many
constraints:
  - Multiple placements on one DFD canvas may reference the same external entity definition.
  - Each placement has independent position and connectors.
  - External entities connect to processes and data entities under rule:dfd-connection-policy.
  - Every outer edge, including both diagonal segments, is explicitly rendered by rule:dfd-rough-rendering.
```
