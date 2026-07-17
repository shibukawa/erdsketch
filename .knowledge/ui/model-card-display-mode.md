---
id: ui:model-card-display-mode
type: ui
title: Model Card Display Mode
---

Two adjacent bottom-left canvas speed dials change model content and identifiers independently.

```yaml
ui:
  control:
    kind: fab_speed_dial
    id: model-card-display-mode
    location:
      - ui:erd-sketch-canvas bottom_left
      - ui:dfd-sketch-canvas bottom_left
    label: Model content
    direction: up
    close_after_selection: true
    trigger_icon: selected_option_icon
    options:
      - id: description
        label: Description
      - id: key-fields
        label: Key fields
  name_control:
    kind: fab_speed_dial
    id: model-card-name-mode
    location: ui:erd-sketch-canvas bottom_left adjacent_to:model-card-display-mode
    label: Identifier display
    direction: up
    close_after_selection: true
    trigger_icon: selected_option_icon
    options:
      - id: business
        source: data:vocabulary-entry.business_name
      - id: system
        source: data:vocabulary-entry.system_name
      - id: physical
        source: data:vocabulary-entry.physical_name
    independent_of: model-card-display-mode
    behavior: requirement:name-display-switching
  target:
    kind: model-card-collection
    id: visible-model-cards
    states:
      description:
        body: description
      key-fields:
        body:
          primary_key: single_grouped_row
          favorite_attributes: complete_ordered_rows
    transition:
      kind: crossfade_with_small_vertical_motion
      reduced_motion: immediate_crossfade_or_no_motion
      stable_card_frame: true
empty_state:
  key_fields: No primary or important fields
constraints:
  - ERD uses two tightly spaced primary FAB buttons horizontally adjacent at the canvas bottom-left.
  - DFD uses the content FAB and has no sidebar card-content control.
  - FAB edge inset matches the bottom-right tips control inset.
  - Primary FAB buttons use the same unobtrusive blue color.
  - Hovering a primary FAB shows its localized label as a tooltip.
  - Each speed dial shows labeled options above its primary button.
  - The selected option is visually distinguishable and exposed with pressed state.
  - Composite key is one non-wrapping row.
  - Favorite rows have no count cap or omission summary.
  - Primary-key attributes are not duplicated as favorite rows.
  - Name mode changes model and field labels without changing description or key-field content mode.
  - Name mode applies to every visible card on the current ERD canvas.
related:
  - ui:erd-sketch-canvas
  - requirement:model-card-field-summary
  - ui:field-list-dialog
  - data:attribute
  - rule:primary-key-favorite
```
