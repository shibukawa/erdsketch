---
id: data:snapshot-reference
type: data
title: Snapshot Reference
---

Snapshot reference copies values intentionally to preserve business truth, improve reads, or decouple systems.

Copying data is not always accidental duplication; intention must be preserved.

```yaml
kinds:
  - Historical Snapshot
  - Business Snapshot
  - Transaction Snapshot
  - Performance Copy
  - Read Model
  - Search Projection
  - Local Replica
example:
  source: Product.current_price
  target: OrderItem.price_at_order
  purpose:
    - historical_correctness
    - loose_coupling
    - auditability
related:
  - data:reference-implementation
  - data:reference-actual-value
  - data:concept-projection
```
