---
id: flow:run-contextual-guided-tour
type: flow
title: Run Contextual Guided Tour
---

```yaml
flow:
  trigger: User opens a surface listed by requirement:contextual-guided-tours.
  steps:
    - id: resolve-locale
      action: wait for ui:language-selector initialization and read the current application locale
    - id: resolve-guide
      action: load the surface guide and data:guided-tour-progress
    - id: decide-auto-start
      action: start only when the current guide version is eligible and required targets are ready
    - id: present-step
      action: render ui:guided-tour-overlay in the resolved locale for the current valid target
    - id: navigate
      action: accept back or next until the user exits or reaches the last step
    - id: finish
      action: record completed for the guide version
  alternatives:
    skip:
      action: record skipped for the guide version
    close:
      action: close without suppressing the next eligible automatic start
    replay:
      trigger: User selects the surface guide from Help.
      action: start regardless of completed or skipped state
    missing_target:
      action: skip the missing step; close without completion when no valid steps remain
    locale_change:
      action: rerender the current step in the new locale without changing its index or progress
  invariant: project and collaboration data remain unchanged
```
