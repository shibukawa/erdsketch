---
id: rule:dfd-model-crud-label
type: rule
title: DFD Model CRUD Endpoint Labels
---

Flows connected to a project model show compact CRUD markers only at the model endpoint.

```yaml
applicability:
  flow: data:data-flow
  condition: either_endpoint_is_model
model_endpoint:
  incoming_flow:
    options:
      - C
      - U
      - D
    default:
      - C
  outgoing_flow:
    options:
      - R
    default:
      - R
  bidirectional_flow:
    options:
      - C
      - R
      - U
      - D
    default:
      - C
      - R
  value: union_of_data:crud-assignment operations represented by the connector
non_model_endpoint:
  label: none
visual:
  placement: beside_connector_endpoint
  style: text_without_container
constraints:
  - Process and external-entity endpoints never show CRUD markers.
  - Incoming means data:data-flow points toward the model; outgoing means it points away from the model.
  - A grouped connector renders the union once at each model-side group boundary.
  - Detailed values remain editable through data:crud-assignment even when the canvas shows only their union.
  - Endpoint labels do not change data direction or rule:dfd-flow-semantics.
```
