---
id: data:entity
type: data
title: Entity
---

Entity represents a business or logical data object under design.

```yaml
fields:
  - name: id
    type: identifier
  - name: name
    type: text
  - name: status
    type: enum
    values:
      - Candidate
      - Reviewed
      - Approved
      - Deprecated
  - name: classification
    type: enum
    source: rule:entity-classification
  - name: description
    type: text
  - name: lifecycle
    type: reference
    target: data:data-lifecycle
relationships:
  - owns many data:attribute
  - participates in data:relationship
```
