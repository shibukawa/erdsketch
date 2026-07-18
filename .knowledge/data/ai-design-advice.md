---
id: data:ai-design-advice
type: data
title: AI Design Advice
---

AI design advice is structured, non-authoritative guidance linked to stable model targets.

```yaml
root:
  required:
    - summary
    - suggestions
suggestion:
  required:
    - id
    - kind
    - target_ids
    - title
    - rationale
  fields:
    kind:
      values:
        - field_type
        - model_split
        - model_quality
    proposed_value: optional
    tradeoffs: list
    alternatives: list
    confidence: optional_ordering_hint
    evidence_target_ids: list
constraints:
  - Advice never mutates project data.
  - Unknown target ids make the suggestion invalid.
  - Rationale and tradeoffs remain visible to the user.
  - Confidence never implies automatic acceptance.
  - Invalid structured output is reported and not partially rendered as trusted advice.
```
