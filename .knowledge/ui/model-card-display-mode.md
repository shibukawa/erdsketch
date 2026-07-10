---
id: ui:model-card-display-mode
type: ui
title: Model Card Display Mode
---

Sidebar control changes the body content rendered inside model cards.

```yaml
ui:
  control:
    kind: segmented-control
    id: model-card-display-mode
    location: sidebar
    label: Card content
    options:
      - id: description
        label: Description
      - id: key-fields
        label: Key fields
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
  - Composite key is one non-wrapping row.
  - Favorite rows have no count cap or omission summary.
  - Primary-key attributes are not duplicated as favorite rows.
related:
  - requirement:model-card-field-summary
  - ui:field-list-dialog
  - data:attribute
  - rule:primary-key-favorite
```
