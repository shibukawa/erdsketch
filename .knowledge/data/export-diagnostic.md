---
id: data:export-diagnostic
type: data
title: Export Diagnostic
---

Export diagnostic identifies one export-readiness problem and its editable source.

```yaml
fields:
  - code
  - severity
  - message
  - export_mode
  - artifact_id
  - source_kind
  - source_id
  - source_path
  - canvas_id
  - editor_target
  - suggested_fix
severity:
  error: blocks export
  warning: permits export after review
navigation:
  action: jump_to_source
  behavior:
    - close or background ui:export-dialog without losing settings
    - open owning editor or canvas
    - select offending record or diagram element
    - focus the invalid field when field-level targeting exists
  fallback: open nearest owning editor and keep diagnostic highlighted
constraints:
  - Diagnostics use stable record IDs, never display labels as identity.
  - Revalidation removes resolved diagnostics and preserves unresolved ordering.
  - No diagnostic silently mutates project data.
```
