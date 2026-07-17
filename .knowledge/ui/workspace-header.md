---
id: ui:workspace-header
type: ui
title: Workspace Header
---

Workspace header keeps project commands visible without carrying viewport controls.

```yaml
ui:
  root:
    kind: header
    id: workspace-header
    children:
      - ui:workspace-data-navigation
      - workspace_tools
      - collaboration_status
      - kind: button
        id: artifact-export
        label: Export
        target: ui:export-dialog
        emphasis: red
order:
  artifact_export: rightmost
exclusions:
  - zoom
  - reset_view
constraints:
  - ERD and DFD use the same command placement.
  - Project archive export remains in ui:project-management-dialog.
```
