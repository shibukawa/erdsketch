---
id: ui:project-settings-view
type: ui
title: Project Settings View
---

Users configure naming behavior shared by every canvas in data:project.

```yaml
ui:
  root:
    kind: settings
    id: project-settings
    children:
      - kind: section
        id: sql-naming
        controls:
          - table_pluralization
          - table_segment_join_mode
          - table_separator
          - field_segment_join_mode
          - field_separator
          - domain_segment_join_mode
          - domain_separator
policy: rule:sql-naming-policy
constraints:
  - Settings are project-wide.
  - Preview shows table, field, and domain examples before save.
```
