---
id: concept:model-layer
type: concept
title: Model Layer
---

The workbench keeps conceptual, logical, physical, and storage-level model layers.

```yaml
layers:
  - id: business_concept
    purpose: business meaning and domain knowledge
  - id: logical_concept
    purpose: implementation-independent design concepts
  - id: logical_entity
    purpose: normalized logical data design
  - id: physical_schema
    purpose: database-specific schema design
  - id: storage
    purpose: storage placement and derived projections
constraints:
  - Physical tables do not replace business concepts.
  - ER diagrams are one visualization of design knowledge.
  - Projection from data:concept-projection connects logical concepts to multiple storage targets.
related:
  - data:value-object
  - data:data-domain
```
