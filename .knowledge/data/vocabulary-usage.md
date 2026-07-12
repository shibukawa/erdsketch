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
  - completeness
completeness:
  unmatched:
    color: red
    icon: error
    condition: unmatched_segments_not_empty
  correction_required:
    color: red
    icon: correction
    condition: unmatched_segments_empty_and_alias_matches_not_empty
  incomplete:
    color: yellow
    icon: warning
    condition: all_segments_matched_and_any_system_or_physical_name_empty
  complete:
    color: green
    icon: success
    condition: all_segments_matched_and_all_three_names_present
constraints:
  - Projection cannot edit dictionary entries or model bindings.
  - Projection is read from data:vocabulary-match-cache.
  - Alias matches prevent complete status and offer requirement:vocabulary-alias-correction.
```
