---
id: data:project-document-set
type: data
title: Project Document Set
---

Project document set is the storage-neutral serialized representation of one data:project.

```yaml
structure:
  manifest:
    required:
      - format_version
      - project_id
      - documents
  documents:
    key: normalized_relative_path
    value: utf8_text
content:
  - project metadata
  - data:model-catalog
  - ERD and DFD canvases
  - dictionaries and vocabulary
  - annotations and settings
constraints:
  - Paths are relative, slash-separated, and traversal-free.
  - Parsing validates the complete set before replacing live state.
  - Storage adapters exchange this value without platform handles or absolute paths.
  - Unknown future documents are preserved when their manifest entry permits passthrough.
```
