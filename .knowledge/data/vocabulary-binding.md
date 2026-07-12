---
id: data:vocabulary-binding
type: data
title: Vocabulary Binding
---

Vocabulary binding composes one model name from ordered matched entries and explicit unmatched text.

```yaml
owner:
  one_of:
    - data:entity
    - data:attribute
    - data:data-domain
fields:
  - name: segments
    type: ordered_list
    item:
      one_of:
        - vocabulary_entry:
            entry: data:vocabulary-entry
            matched_text: text
            match_kind:
              enum:
                - preferred
                - alias
        - unmatched_text: text
  - name: source_text
    type: text
constraints:
  - Segment boundaries are explicit and preserved.
  - One name may bind one whole phrase or multiple vocabulary entries.
  - Unmatched text remains visible and never becomes a dictionary entry implicitly.
  - Display names are derived without copying dictionary values.
  - Alias matches retain the used text and preferred business_name correction target.
```
