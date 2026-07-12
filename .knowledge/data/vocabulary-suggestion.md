---
id: data:vocabulary-suggestion
type: data
title: Vocabulary Suggestion
---

Vocabulary suggestion is a transient candidate for completing one data:vocabulary-entry.

```yaml
fields:
  - name: system_name
    type: text
  - name: physical_name
    type: text
  - name: alternatives
    type: name_pair_list
  - name: rationale
    type: text
  - name: confidence
    type: ranking_score
  - name: resolution_kind
    type: enum
    values:
      - exact_match
      - alias_match
      - composed
      - similar_concept
      - new_concept
constraints:
  - confidence ranks candidates and is not a calibrated probability.
  - A suggestion is not catalog authority.
  - Rejection leaves data:vocabulary-entry unchanged.
```
