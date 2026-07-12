---
id: data:vocabulary-match-cache
type: data
title: Vocabulary Match Cache
---

Vocabulary match cache materializes resolved names and coverage for fast display.

```yaml
scope: one data:project
authority: derived
storage: runtime_memory
key:
  - owner_type
  - owner_id
fields:
  - source_text
  - source_revision
  - vocabulary_revision
  - naming_policy_revision
  - binding: data:vocabulary-binding
  - business_name
  - system_name
  - physical_name
  - name_segments:
      modes:
        - business
        - system
        - physical
      item:
        fields:
          - text
          - match_state
  - alias_matches
  - usage: data:vocabulary-usage
indexes:
  - vocabulary_entry_to_owner_keys
constraints:
  - UI display reads cached output and never runs rule:vocabulary-resolution.
  - Cache is never the source of vocabulary or model names.
  - Missing or stale entries are rebuilt before use.
  - Cache may be discarded without data loss.
  - Structured name segments preserve unmatched spans for requirement:unmatched-name-presentation.
```
