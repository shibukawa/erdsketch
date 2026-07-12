---
id: term:vocabulary
type: term
title: Vocabulary
---

Vocabulary maps user-facing business language to formal system language and executable physical names.

```yaml
names:
  business: language used by domain participants
  system: formal name used in screens and design documents
  physical: identifier used by SQL and generated artifacts
constraints:
  - System names may use any natural language.
  - Physical names may use English, romanized Japanese, or project conventions.
  - Vocabulary does not model DDD bounded contexts or context maps.
record: data:vocabulary-entry
resolution: rule:vocabulary-resolution
```
