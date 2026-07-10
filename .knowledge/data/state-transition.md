---
id: data:state-transition
type: data
title: State Transition
---

Entities may define state machines and update permissions per state.

```yaml
example_states:
  - Draft
  - Accepted
  - Shipped
  - Completed
state_fields:
  - name
  - allowed_updates
  - allowed_transitions
  - terminal
related:
  - data:data-lifecycle
```
