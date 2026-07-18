---
id: ui:dialog-ai-chat-button
type: ui
title: Dialog AI Chat Button
---

Dialogs that edit or inspect design content expose the same AI chat entry point in their shared header chrome. Project opening, project storage management, and ERD/DFD workspace selection dialogs do not expose AI assistance.

```yaml
ui:
  root:
    kind: icon-button
    id: dialog-ai-chat
    label: Ask AI about this dialog
    action: open_ui:ai-assistant-chat-window
    placement:
      region: dialog_header_actions
      horizontal: right
      order: immediately_before_close_button
      fallback_without_close_button: rightmost_header_action
    visibility: design_context_dialog_only
    unavailable_provider:
      enabled: false
      reason: visible_on_hover_focus_and_assistive_technology
integration:
  mechanism: shared_dialog_chrome
  applies_to: design_context_dialogs
  excludes:
    - project_start_or_open
    - project_storage_management
    - erd_dfd_workspace_selection
  context:
    - dialog_id
    - selected_model_ids
    - selected_attribute_ids
    - relevant_committed_values
    - relevant_uncommitted_draft_values
responsive:
  keep_in_header: true
  collapse_label_before_icon: true
  truncate_title_before_removing_button: true
accessibility:
  - Icon has a persistent accessible name.
  - Button remains in a predictable keyboard order immediately before close.
  - Disabled reason is available without pointer hover.
constraints:
  - Navigation and storage dialogs never show dialog or background canvas AI entry points.
  - Placement is relative to dialog header chrome, never viewport coordinates.
  - Button does not overlap title, close, drag, or resize controls.
  - Opening chat preserves all dialog edits and current selection.
  - Context is not sent until the user submits a chat message.
```
