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
canonical_file:
  extension: .erdsketch.json
  media: application/json
  encoding: UTF-8
  formatting: deterministic_pretty_print_with_final_newline
  purpose: editable project source of truth
content:
  - project metadata
  - data:model-catalog
  - ERD canvases, model placements, and rotation
  - DFD canvases, node coordinates, groups, flows, and CRUD matrix ordering
  - dictionaries and vocabulary
  - annotations and settings
constraints:
  - Paths are relative, slash-separated, and traversal-free.
  - Parsing validates the complete set before replacing live state.
  - Storage adapters exchange this value without platform handles or absolute paths.
  - Unknown future documents are preserved when their manifest entry permits passthrough.
  - The canonical file is uncompressed JSON and is distinct from data:portable-project-archive.
  - Code-generation JSON is a derived data:codegen-exchange-model and never replaces this source of truth.
  - Layout-preserving diagram exports read original layout fields from the same immutable snapshot used for semantic exports.
```
