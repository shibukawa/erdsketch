---
id: requirement:vocabulary-segmentation-registration
type: requirement
title: Vocabulary Segmentation Registration
---

Users manually split unmatched names into phrases or words, then register selected segments.

```yaml
trigger:
  source: unmatched data:vocabulary-usage
  action: ui:vocabulary-registration-dialog
input:
  source_text: required
  boundaries: user_controlled
  language_assumption: none
operations:
  - insert_boundary
  - remove_boundary
  - merge_adjacent_segments
  - register_selected_segment
  - register_selected_consecutive_segments_as_one_entry
  - leave_segment_unmatched
examples:
  phrase:
    source: Shopping Item
    options:
      - [Shopping Item]
      - [Shopping, Item]
  longer_phrase:
    source: Shopping Order Item
    options:
      - [Shopping Order, Item]
      - [Shopping, Order Item]
  unspaced_language:
    source: user_defined_text
    segmentation: explicit_boundaries
result:
  creates: data:vocabulary-entry
  updates: data:vocabulary-binding
constraints:
  - Whitespace is an initial hint, not an authoritative boundary.
  - The system never forces one linguistic tokenizer.
  - Registration requires explicit user confirmation.
```
