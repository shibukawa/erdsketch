---
id: data:reconciliation-pattern
type: data
title: Reconciliation Pattern
---

Reconciliation pattern matches independent transaction streams.

```yaml
patterns:
  - One-to-One
  - One-to-Many
  - Many-to-One
  - Many-to-Many
  - Partial Matching
  - Tolerance Matching
  - Suspense
example:
  left_stream: Invoice
  right_stream: Payment
  matching_entity: Reconciliation
fields:
  - left_transaction
  - right_transaction
  - match_status
  - matched_amount
  - tolerance
  - unmatched_reason
related:
  - data:relationship
  - data:query-profile
```
