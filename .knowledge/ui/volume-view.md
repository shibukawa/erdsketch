---
id: ui:volume-view
type: ui
title: Volume View
---

Users enter daily counts and inspect row and capacity estimates.

```yaml
ui:
  root:
    kind: view
    id: volume-view
    children:
      - kind: estimate-form
        item: data:volume-estimate
      - kind: derived-metric-panel
        fields:
          - total_row_count
          - database_size
          - annual_growth
```
