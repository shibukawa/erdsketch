---
id: data:dfd-process
type: data
title: DFD Process
---

DFD process is executable work represented on data:dfd-canvas.

```yaml
fields:
  - id
  - name
  - kind
  - physical_processes
  - description
kind:
  batch:
    meaning: system-executed batch process
    shape: roughjs_predefined_process
    indicator: batch
  ui:
    meaning: human-operated process
    shape: roughjs_predefined_process
    indicator: ui
editing:
  kind:
    mutable: true
    options:
      - batch
      - ui
  physical_processes:
    cardinality: zero_or_more
    presentation_when_present: data:dfd-logical-process
constraints:
  - A process connects directly to a model.
  - A process never connects directly to another process.
  - Process-to-process flow inserts data:dfd-intermediate-data.
  - Batch and UI are editable variants of the same process node type.
  - Every process uses the flowchart predefined-process outline: one rectangle with an inner vertical line near each side.
  - Batch and UI differ by label or secondary indicator, never by outer shape.
  - Adding physical-process entries changes presentation but not node identity or type.
```
