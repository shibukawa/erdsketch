---
id: data:vocabulary-usage
type: data
title: Vocabulary Usage
---

Vocabulary usage is a read-only projection of dictionary coverage for one model name.

```yaml
fields:
  - owner_type
  - owner_id
  - owner_label
  - binding: data:vocabulary-binding
  - name: matched_entries
    type: list
    item: data:vocabulary-entry
  - name: alias_matches
    type: list
    item:
      fields:
        - matched_text
        - preferred_business_name
  - unmatched_segments: text_list
  - name: indicators
    type: set
  - name: primary_indicator
    type: enum
indicators:
  unregistered:
    presentation: red
    condition: unmatched_segments_not_empty
  alias_match:
    presentation: purple
    condition: alias_matches_not_empty
  missing_system_name:
    presentation: orange_squiggle
    condition: any_matched_entry_system_name_empty
  missing_physical_name:
    presentation: yellow_squiggle
    condition: any_matched_entry_physical_name_empty
  complete:
    presentation: green
    condition: no_other_indicator
primary_indicator:
  presentation: highest_priority_only
  priority:
    - unregistered
    - missing_system_name
    - missing_physical_name
    - alias_match
    - complete
constraints:
  - Projection cannot edit dictionary entries or model bindings.
  - Projection is read from data:vocabulary-match-cache.
  - Indicators may coexist in the projection, but the row displays only primary_indicator.
  - Alias matches prevent complete status and offer requirement:vocabulary-alias-correction.
```
