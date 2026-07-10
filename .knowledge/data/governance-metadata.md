---
id: data:governance-metadata
type: data
title: Governance Metadata
---

Governance metadata records ownership, risk, quality, and lineage around data.

```yaml
fields:
  - owner
  - steward
  - system_of_record
  - lineage
  - pii
  - security_classification
  - data_quality
  - data_contract
  - ownership_boundary
  - reference_policy
applies_to:
  - data:entity
  - data:concept-projection
  - data:data-flow
related:
  - system:storage-target
  - data:data-ownership
  - data:system-boundary-pattern
  - requirement:future-extensions
```
