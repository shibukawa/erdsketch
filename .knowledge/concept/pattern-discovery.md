---
id: concept:pattern-discovery
type: concept
title: Pattern Discovery
---

Pattern discovery suggests relevant patterns from the current modeling context.

```yaml
triggers:
  - signal: status
    possible_patterns:
      - Enum
      - State Machine
      - History
  - signal: type
    possible_patterns:
      - Enum
      - Role Pattern
      - Inheritance
      - Table Split
  - signal: Address
    possible_patterns:
      - Value Object
      - Address Reuse
  - signal: repeated_field_or_list
    possible_patterns:
      - Child Entity
      - Dependent Entity
      - Associative Entity
  - signal: external_master_reference
    possible_patterns:
      - Reference API
      - Local Replica
      - CDC Replica
      - Transaction Snapshot
  - signal: reference_value_and_actual_value_pair
    possible_patterns:
      - Reference Value vs Actual Value
      - Business Snapshot
  - signal: correction_required
    possible_patterns:
      - In-place Correction
      - Red-Black Correction
      - Adjustment Entry
      - Versioned Correction
constraints:
  - Do not only list every pattern.
  - Rank by context and intent.
  - Explain tradeoffs when the user asks or applies a pattern.
related:
  - concept:design-pattern-catalog
  - concept:pattern-heuristic
  - concept:assistive-ai-experience
  - requirement:ai-review
```
