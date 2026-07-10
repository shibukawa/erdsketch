---
id: data:correction-pattern
type: data
title: Correction Pattern
---

Correction pattern records how business data is corrected without losing audit meaning.

```yaml
patterns:
  - name: In-place Correction
    suitable_for:
      - drafts
      - typo_fixes
  - name: Red-Black Correction
    suitable_for:
      - accounting
      - inventory
      - financial_systems
    behavior: cancel with negative transaction and create corrected transaction
  - name: Reversal
    behavior: create reversing transaction only
  - name: Adjustment Entry
    behavior: keep original transaction and store delta
  - name: Versioned Correction
    suitable_for:
      - contracts
      - quotations
      - applications
    behavior: create a new version
  - name: Status-based Correction
    behavior: represent cancellation by status
related:
  - data:state-transition
  - data:data-lifecycle
  - requirement:design-decision-history
```
