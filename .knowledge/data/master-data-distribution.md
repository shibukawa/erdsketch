---
id: data:master-data-distribution
type: data
title: Master Data Distribution
---

Master data distribution records how master data is shared or copied across systems.

```yaml
patterns:
  - name: Shared Master
    tradeoffs:
      pros:
        - strong_consistency
      cons:
        - tight_coupling
  - name: Replicated Master
    synchronization:
      - CDC
      - Events
      - Batch
    tradeoffs:
      pros:
        - loose_coupling
        - high_availability
  - name: Reference API
    tradeoffs:
      pros:
        - single_source_of_truth
      cons:
        - runtime_dependency
  - name: Context-local Master
    purpose: local meaning per bounded context
related:
  - data:reference-implementation
  - data:data-ownership
```
