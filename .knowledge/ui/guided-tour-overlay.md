---
id: ui:guided-tour-overlay
type: ui
title: Guided Tour Overlay
---

Guided tours dim surrounding content and visually connect one explanation to its current target.

```yaml
ui:
  root:
    kind: modal-tour-overlay
    id: guided-tour-overlay
    children:
      - kind: backdrop
        appearance: dimmed
      - kind: spotlight
        target: current_step_target
        appearance: highlighted_cutout
      - kind: arrow
        from: callout
        to: current_step_target
      - kind: callout
        role: dialog
        fields:
          - title
          - description
          - current_step
          - total_steps
        controls:
          - back
          - next
          - finish
          - skip
          - close
positioning:
  choose_visible_side_automatically: true
  keep_callout_inside_viewport: true
  scroll_target_into_view: when_needed
  recalculate_on:
    - viewport_resize
    - target_layout_change
    - dialog_open
target_failure:
  missing: skip_step_and_continue
  all_missing: close_without_marking_complete
accessibility:
  - Move focus into the callout when a tour starts.
  - Keep keyboard focus within the active callout.
  - Back, next, finish, skip, and close are keyboard operable.
  - Escape temporarily closes the tour and restores focus to its launch context.
  - Announce the step title, description, and position to assistive technology.
  - Use more than color alone to identify the highlighted target.
  - Respect reduced-motion preferences.
constraints:
  - The overlay appears above canvases, panels, dialogs, and portal content.
  - The spotlight and arrow never obscure the callout controls.
  - Tour chrome and content follow requirement:user-interface-localization.
```
