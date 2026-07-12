---
id: rule:sql-naming-policy
type: rule
title: SQL Naming Policy
---

SQL physical names use one project-wide normalization policy.

```yaml
scope: data:project
physical_name:
  case: snake_case
  table_pluralization:
    configurable: true
    default: singular
    values:
      - singular
      - plural
  abbreviations:
    representation: embedded_in_physical_name
  segment_join:
    table:
      configurable: true
      default: separator
    field:
      configurable: true
      default: separator
    domain:
      configurable: true
      default: concatenate
    modes:
      separator:
        character: configurable
        default: _
      concatenate:
        character: ""
derived_names:
  sql: authoritative_physical_name
  other_targets:
    source: authoritative_physical_name
    transformations:
      - CamelCase
      - camelCase
constraints:
  - Derived target names do not add columns to data:vocabulary-entry.
  - Changing pluralization regenerates only names that remain policy-managed.
  - Segment joining applies after rule:vocabulary-resolution.
  - Join policy is configured independently for table, field, and domain names.
  - Normalization applies only to matched vocabulary physical_name segments.
  - Unmatched source text is never converted to snake_case or accepted as a physical name.
unmatched_presentation: requirement:unmatched-name-presentation
```
