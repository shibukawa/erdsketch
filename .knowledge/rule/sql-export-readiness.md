---
id: rule:sql-export-readiness
type: rule
title: SQL Export Readiness
---

SQL DDL generation is allowed only when the selected physical projection is complete and internally consistent.

```yaml
result: list of data:export-diagnostic
blocking_checks:
  naming:
    - every exported data:entity has a non-empty physical name
    - every expanded physical column has a non-empty physical name
    - identifiers are valid and unique in target scope after dialect normalization
    - generated names do not collide with explicit names or target reserved words
  domains:
    - every exported data:attribute has an assigned data:data-domain
    - every assigned domain is defined and expandable by rule:domain-expansion
    - composite domain components resolve without cycles
    - key expansion follows rule:domain-key-projection
  keys_and_relationships:
    - every relationship endpoint resolves
    - referenced primary keys resolve with matching expanded arity and compatible types
    - foreign-key names and local columns are unambiguous
    - delete actions are compatible with nullability and policy:deletion-policy
    - unsupported target constraints are reported, never silently dropped
  composition_paths:
    - each data:composition-relationship child has exactly one owner
    - ownership paths are acyclic
    - no child can reach conflicting owners through composition paths
    - relational direction is child to owner primary key
    - delete action is cascade on every composition edge
    - relationship name is a valid non-conflicting exported field name
  target:
    - selected dialect is supported
    - every projected primitive, default, generation rule, index, and partition has a target mapping
warning_checks:
  - target accepts but does not enforce a modeled constraint
  - target-specific data-type conversion may lose precision or range
  - data:ddl-extension-text is target-specific or not portable
execution:
  scope: selected dialects and selected models
  rerun_after_jump_fix: true
  deterministic_order:
    - artifact
    - source_path
    - code
```
