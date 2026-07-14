---
id: rule:dfd-flow-semantics
type: rule
title: DFD Flow Semantics
---

```yaml
meaning:
  arrow: possible normal-case data movement
  direction: data movement only
  coverage: maximum set of flows that may occur during normal operation
not_represented:
  - execution_order
  - control_flow
  - branch_condition
  - input_type_condition
  - push_pull_program_direction
label:
  required: false
  type: free_text
  examples:
    - timer schedule or frequency
    - event driven
    - push or pull
    - operational note
protocol:
  required: false
  type: free_text
  controlled_vocabulary: future
constraints:
  - Push and pull do not change DFD topology or arrow direction.
  - A label may describe operation but does not create conditional semantics.
  - Exceptional and failure flows are outside this DFD.
```
