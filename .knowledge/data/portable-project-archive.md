---
id: data:portable-project-archive
type: data
title: Portable Project Archive
---

Portable project archive carries data:project-document-set across browsers, desktop applications, and runtime modes.

```yaml
encoding:
  inner: txtar
  text: UTF-8
  compression: gzip
  browser_api:
    write: CompressionStream
    read: DecompressionStream
contents:
  source: data:project-document-set
security:
  - Reject absolute paths and parent traversal.
  - Enforce limits for compressed bytes, expanded bytes, document count, and document size.
  - Validate the manifest and all documents before import commit.
interoperability:
  - Server-web, static-web, and Wails-desktop modes read and write the same archive bytes.
  - Archive export is available regardless of the selected primary storage adapter.
open_decisions:
  - file_extension
  - mime_type
  - exact_resource_limits
```
