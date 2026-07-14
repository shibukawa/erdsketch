---
id: ui:dfd-daily-tips
type: ui
title: DFD Daily Tips
---

```yaml
ui:
  root:
    kind: rotating_tips
    id: dfd-daily-tips
    tips:
      - DFD is not a flowchart.
      - Arrows show data movement, not execution order.
      - Draw the maximum set of normal-case flows that may occur.
      - Do not draw conditional flows such as only when the input type is X.
      - Push and pull do not change arrow direction; mention them in the optional label when useful.
      - Use the optional protocol field when implementation context helps.
source: rule:dfd-flow-semantics
```
