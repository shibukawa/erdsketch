---
id: data:reference-actual-value
type: data
title: Reference Value and Actual Value
---

Reference value and actual value records planned, standard, or reference values separately from applied results.

```yaml
examples:
  - reference: List Price
    actual: Actual Selling Price
  - reference: Planned Delivery
    actual: Actual Delivery
  - reference: Standard Tax Rate
    actual: Applied Tax Rate
purposes:
  - preserve_original_assumptions
  - explain_differences
  - enable_auditing
related:
  - data:snapshot-reference
  - data:query-profile
```
