---
id: rule:entity-classification
type: rule
title: Entity Classification
---

Entities and tables have a design role classification.

```yaml
values:
  - Master
  - Transaction
  - Detail
  - Summary
  - History
  - Snapshot
  - Work
  - Reference
  - Log
applies_to:
  - data:entity
  - data:model-seed
related:
  - rule:model-seed-labels
```
