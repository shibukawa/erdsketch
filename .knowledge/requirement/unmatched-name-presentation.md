---
id: requirement:unmatched-name-presentation
type: requirement
title: Unmatched Name Presentation
---

System and physical name views expose unregistered source text instead of generating a plausible technical name.

```yaml
trigger:
  source: data:vocabulary-binding
  condition: unmatched_text_segment_exists
targets:
  - data:entity
  - data:attribute
  - data:data-domain
modes:
  system_name:
    matched_segment: data:vocabulary-entry system_name
    unmatched_segment:
      text: original_source_text
      style: red_error
  physical_name:
    matched_segment:
      source: data:vocabulary-entry physical_name
      policy: rule:sql-naming-policy
    unmatched_segment:
      text: original_source_text
      style: red_error
      normalization: forbidden
composition:
  representation: structured_segments
  source: data:vocabulary-match-cache name_segments
  preserve_unmatched_boundaries: true
readiness:
  status: unmatched
  ddl_eligible: false
constraints:
  - Unmatched text is not converted to snake_case.
  - Unmatched text is not treated as a temporary system or physical name.
  - Separators may render between resolved segments but do not normalize unmatched text.
  - Red styling remains visible anywhere name switching renders the composed name.
acceptance:
  - Switching to system mode leaves each unregistered span visible in red.
  - Switching to physical mode leaves each unregistered span visible in red and unchanged.
  - A partially matched name distinguishes resolved output from every unmatched span.
  - Registering the missing term and refreshing the owner replaces the red span with resolved output.
  - DDL generation remains blocked while any unmatched span exists.
```
