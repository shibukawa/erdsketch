---
id: concept:pattern-heuristic
type: concept
title: Pattern Heuristic
---

Heuristic is a diagnostic signal that suggests patterns; it is not the pattern itself.

```yaml
distinction:
  pattern:
    meaning: intentional design decision
    examples:
      - History Table
      - Role Pattern
      - Value Object
      - Monthly Partition
  heuristic:
    meaning: observed situation that suggests patterns
    examples:
      - signal: status column detected
        suggests: State Pattern
      - signal: append-only data
        suggests: History Table
      - signal: millions of rows per month
        suggests: Partitioning
workflow:
  - observation
  - heuristic
  - relevant_patterns
  - human_decision
  - data:model-transformation
  - database
related:
  - concept:pattern-discovery
  - concept:intent-based-navigation
  - concept:assistive-ai-experience
```
