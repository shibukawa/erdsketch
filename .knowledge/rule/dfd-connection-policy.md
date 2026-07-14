---
id: rule:dfd-connection-policy
type: rule
title: DFD Connection Policy
---

```yaml
direct_connections:
  node_classes:
    process:
      - data:dfd-process
    data_entity:
      - data:model-catalog
      - data:dfd-intermediate-data
    external_entity:
      - data:dfd-external-entity
  allowed:
    - process to data_entity
    - data_entity to process
    - process to external_entity
    - external_entity to process
    - data_entity to external_entity
    - external_entity to data_entity
  forbidden:
    process_to_process:
      repair: Select a transfer kind and insert data:dfd-intermediate-data.
    data_entity_to_data_entity:
      repair: Select or create data:dfd-process and insert it between both data entities.
logical_process_exception:
  concept: data:dfd-logical-process
  representation: process_with_physical_process_entries
  allows_internal_program_integration: true
  creates_direct_dfd_flow: false
invariant: Every persisted data:data-flow has an allowed endpoint pair after repair.
```
