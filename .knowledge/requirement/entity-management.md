---
id: requirement:entity-management
type: requirement
title: Entity Management
---

Users manage entity candidates and evolve them into reviewed or approved entities.

```yaml
entity_statuses:
  - Candidate
  - Reviewed
  - Approved
  - Deprecated
examples:
  - Customer
  - Order
  - Product
  - Department
attributes:
  editable: true
  fields:
    - name
    - data_type
    - required
    - unique
    - default
    - value_generation
    - estimated_average_size_bytes
    - description
    - primary_key
    - important
  quick_entry: requirement:field-list-management
related:
  - data:entity
  - data:attribute
  - ui:entity-candidate-view
  - requirement:field-list-management
  - requirement:model-card-field-summary
  - requirement:sql-table-definition
  - requirement:capacity-estimation
```
