---
id: data:dfd-intermediate-file
type: data
title: DFD Intermediate File
---

DFD intermediate file defines the file kind of data:dfd-intermediate-data.

```yaml
applies_when_kind: file
shape: roughjs_folded_file
fold:
  outer_diagonal: required
  inner_crease: required
includes:
  - physical_file
  - email
  - document_message
  - api_payload
excludes:
  - queue
  - stream
  - standalone_event
constraints:
  - File is the editor category for document-like transfer data, including transient API payloads.
  - File-kind intermediate data may form groups through data:dfd-overlap-group.
  - The folded corner remains legible because both contour and crease are drawn by rule:dfd-rough-rendering.
```
