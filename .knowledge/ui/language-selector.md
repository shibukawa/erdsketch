---
id: ui:language-selector
type: ui
title: Language Selector
---

Compact locale control available during launch and later project management for requirement:user-interface-localization.

```yaml
surfaces:
  - surface: ui:workspace-start-panel
    placement: panel_header
  - surface: ui:project-management-dialog
    placement: header_right
options:
  - ja
  - en
selection:
  effect: immediate
  scope: entire_application
  persisted: true
workspace_visibility:
  erd_header: false
  dfd_header: false
  project_dialog: true
fallback_when_panel_is_bypassed: saved_preference_else_browser_language_else_en
accessibility:
  name: Language
```
