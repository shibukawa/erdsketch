---
id: rule:vocabulary-resolution
type: rule
title: Vocabulary Resolution
---

Vocabulary lookup prefers the longest matching term and rejects indistinguishable duplicates.

```yaml
matching:
  scope: one data:project vocabulary
  candidates:
    - business_name
    - aliases
  selection: longest_match
  algorithm:
    - start_at_beginning_of_source_text
    - choose_longest_matching_entry
    - classify_match_as_preferred_or_alias
    - emit data:vocabulary-binding segment
    - continue_after_match
    - preserve_unmatched_text
  exact_duplicate:
    result: validation_warning
    resolution: user_must_edit_conflicting_entries
    auto_select: forbidden
  equal_length_same_entry:
    preference: business_name_over_alias
constraints:
  - A longer matching term wins over its contained shorter term.
  - Fully duplicate lookup terms remain invalid until disambiguated.
  - AI never resolves an exact duplicate silently.
  - Alias matches resolve output through their entry but remain correction-required.
  - Matching never rewrites alias source text automatically.
  - Matching never creates entries or boundaries.
  - Rendering never invokes this rule; requirement:vocabulary-cache-maintenance invokes it.
```
