---
id: concept:intent-based-navigation
type: concept
title: Intent Based Navigation
---

Patterns are organized by design intent, not by implementation category alone.

```yaml
examples:
  - intent: reduce_duplicated_data
    possible_patterns:
      - Entity Extraction
      - Lookup Table
      - Value Object
  - intent: need_multiple_values
    possible_patterns:
      - Child Entity
      - Dependent Entity
      - Associative Entity
  - intent: improve_update_performance
    possible_patterns:
      - Entity Split
      - CQRS
      - Cache
  - intent: keep_historical_records
    possible_patterns:
      - History Table
      - Snapshot
      - Bi-temporal
      - Business Snapshot
  - intent: preserve_transaction_assumptions
    possible_patterns:
      - Transaction Snapshot
      - Reference Value vs Actual Value
      - Audit Trail
  - intent: represent_different_roles
    possible_patterns:
      - Role Pattern
      - Inheritance
      - Separate Entities
  - intent: reference_external_data
    possible_patterns:
      - Foreign Key Reference
      - Reference API
      - Local Replica
      - Event-synchronized Copy
      - Transaction Snapshot
  - intent: correct_business_data
    possible_patterns:
      - In-place Correction
      - Red-Black Correction
      - Reversal
      - Adjustment Entry
      - Versioned Correction
      - Status-based Correction
path:
  - intent
  - heuristic
  - problem
  - candidate_patterns
  - human_decision
  - transformation
  - physical_schema
related:
  - concept:design-pattern-catalog
  - data:design-pattern
  - concept:pattern-heuristic
```
