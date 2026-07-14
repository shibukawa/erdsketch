---
id: data:dfd-intermediate-data
type: data
title: DFD Intermediate Data
---

DFD intermediate data makes the transferred representation explicit between processes without implying that every transfer is a physical file.

```yaml
fields:
  - id
  - name
  - kind
  - format
  - description
kind:
  file:
    profile: data:dfd-intermediate-file
    shape: roughjs_folded_file_with_crease
  queue:
    meaning: asynchronous queued data including events
    shape: roughjs_horizontal_cylinder_with_cap_seam
mapping:
  api_payload: file
  stream: queue
  event: queue
  email_or_document_message: file
editing:
  kind:
    mutable: true
    options:
      - file
      - queue
creation:
  trigger: User attempts to connect two processes.
  interaction: Select file or queue, create this node, then create two data:data-flow records.
constraints:
  - File and queue are the only intermediate-data variants exposed by the editor.
  - API communication remains direct at runtime but is represented as file in the DFD.
  - Stream communication is represented as queue in the DFD.
  - Separate C4 containers do not need to be merged into one logical process.
  - An event cannot exist as a standalone node; represent it in a queue.
  - Intermediate data may form data-entity groups through data:dfd-overlap-group.
```
