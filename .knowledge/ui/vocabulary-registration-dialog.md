---
id: ui:vocabulary-registration-dialog
type: ui
title: Vocabulary Registration Dialog
---

Dialog lets users segment unmatched model text and register one or more dictionary entries.

```yaml
ui:
  root:
    kind: dialog
    id: vocabulary-registration
    children:
      - kind: segmentation-editor
        source: data:vocabulary-usage
        interactions:
          - insert_boundary
          - remove_boundary
          - select_one_or_more_adjacent_segments
      - kind: segment-preview
        shows:
          - matched_entry
          - unmatched_text
          - pending_registration
      - kind: button
        label: Register selected
        action: requirement:vocabulary-segmentation-registration
      - kind: button
        label: Cancel
constraints:
  - Segmentation is not limited to whitespace.
  - Registration may create one phrase entry or multiple word entries.
```
