---
id: ui:language-selector
type: ui
title: Language Selector
---

Compact locale control in ui:workspace-start-panel for requirement:user-interface-localization.

```yaml
surface: ui:workspace-start-panel
placement: panel_header
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
fallback_when_panel_is_bypassed: saved_preference_else_browser_language_else_en
accessibility:
  name: Language
```
