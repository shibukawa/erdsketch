---
id: concept:assistive-ai-experience
type: concept
title: Assistive AI Experience
---

AI should provide design inspiration and relevant knowledge without making the user feel examined or blamed.

```yaml
avoid:
  - exam_like_required_field_checklists
  - question_barrages
  - implying_the_user_has_failed
  - replacing_user_thinking
prefer:
  - show_design_idea_cards
  - suggest_patterns_as_options
  - explain_tradeoffs
  - provide_examples_from_context
  - keep_non_ai_paths_available
design_idea_examples:
  - History
  - Lifecycle
  - Value Object
  - Volume
  - OLAP
  - PII
example:
  context: User introduced shipping.
  response:
    related_concepts:
      - Address
      - Shipping Address
      - Sender Address
related:
  - concept:pattern-discovery
  - concept:design-pattern-catalog
  - requirement:ai-review
```
