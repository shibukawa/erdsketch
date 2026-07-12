---
id: flow:vocabulary-cache-lifecycle
type: flow
title: Vocabulary Cache Lifecycle
---

Vocabulary cache lifecycle separates matching work from rendering.

```yaml
flow:
  trigger: Open data:project.
  steps:
    - id: load-authority
      action: load model names, data:vocabulary-entry, and rule:sql-naming-policy
    - id: build-cache
      action: execute requirement:vocabulary-cache-maintenance initialization
      output: data:vocabulary-match-cache
    - id: publish
      action: atomically publish cache snapshot
    - id: render
      action: render names and usage status from cache
    - id: observe-change
      action: classify mutation and run the narrowest incremental update
    - id: republish
      action: atomically replace affected cache output
  failure:
    stale_or_missing_entry: rebuild before rendering affected owner
```
