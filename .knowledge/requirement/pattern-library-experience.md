---
id: requirement:pattern-library-experience
type: requirement
title: Pattern Library Experience
---

The same pattern library supports non-AI and AI usage.

```yaml
non_ai_mode:
  capabilities:
    - browse
    - search
    - apply
ai_mode:
  capabilities:
    - select_relevant_patterns
    - explain_tradeoffs
    - recommend_based_on_context
shared_source: concept:design-pattern-catalog
constraints:
  - AI mode and non-AI mode use the same knowledge.
  - The tool remains fully usable without AI.
related:
  - concept:assistive-ai-experience
  - concept:pattern-discovery
  - ui:pattern-library-view
```
