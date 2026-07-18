---
id: ui:local-session-leave-dialog
type: ui
title: Local Session Leave Dialog
---

```yaml
ui:
  root:
    kind: dialog
    id: local-session-leave
    title: Leave this editing session?
    state:
      role: actor:session-participant
      accepted_changes: saved_by_host
      pending_changes: not_guaranteed_saved
    children:
      - kind: button
        id: stay
        label: Stay
        action: cancel_leave
      - kind: button
        id: leave
        label: Leave
        action: disconnect_local_participant
behavior:
  trigger:
    - switch_project
    - close_workspace_in_app
    - explicit_leave
  default_action: stay
  browser_reload_or_tab_close: use_native_beforeunload_confirmation
constraints:
  - Do not claim that pending optimistic changes are saved.
  - Browser-native confirmation text may not be customized.
  - Cancelling leaves the connection and current project unchanged.
```
