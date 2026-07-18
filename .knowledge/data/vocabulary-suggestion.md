---
id: data:vocabulary-suggestion
type: data
title: Vocabulary Suggestion
---

Vocabulary suggestion is a transient candidate for completing one data:vocabulary-entry.

```yaml
fields:
  - name: entry_id
    type: data:vocabulary-entry identifier
  - name: target
    type: enum
    values:
      - system_name
      - physical_name
  - name: candidates
    type: text_list
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
  - Each streamed item validates against the structured output schema before display.
  - Rejection leaves data:vocabulary-entry unchanged.
```
