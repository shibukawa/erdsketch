---
id: requirement:contextual-guided-tours
type: requirement
title: Contextual Guided Tours
---

Users receive short, surface-specific explanations when first encountering major modeling tools.

```yaml
scope:
  required_tours:
    - ui:erd-sketch-canvas
    - ui:dfd-sketch-canvas
    - ui:field-list-dialog
    - ui:model-catalog-view
    - ui:vocabulary-view
    - ui:vocabulary-registration-dialog
  eligible_extensions:
    - ui:model-refinement-panel
    - ui:domain-dictionary-panel
trigger:
  automatic: first_open_of_each_surface_in_browser
  granularity: surface_type_not_project_or_canvas_instance
  start_after:
    - initial_locale_is_resolved
    - target_elements_are_mounted_and_positioned
  manual_replay: help_menu
content:
  purpose: explain_primary_tasks_and_controls
  length: short
  order: task_sequence
  localization: requirement:user-interface-localization
  locale_source: current_application_locale_selected_by_ui:language-selector
  locale_change: rerender_current_step_without_restarting
state: data:guided-tour-progress
presentation: ui:guided-tour-overlay
behavior: flow:run-contextual-guided-tour
implementation:
  candidate: react-joyride
  adoption_gate:
    - works_with_nested_dialogs_and_portals
    - preserves_correct_overlay_stacking
    - handles_missing_or_responsive_targets
    - meets_keyboard_and_screen_reader_requirements
acceptance:
  - Each required surface has an independent tour and completion state.
  - Opening another project or canvas does not repeat a completed surface tour.
  - First-open detection waits until the surface and its tour targets are ready.
  - A tour never appears before the initial language selection is resolved.
  - Users can move backward and forward, finish, skip, temporarily close, and replay a tour.
  - A missing target never blocks opening or operating the underlying surface.
  - Tour content follows the selected Japanese or English locale.
  - Changing language while a tour is open updates the current step immediately without losing progress.
  - Tour state never changes project data or collaborative session state.
```
