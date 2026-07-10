---
id: ui:vocabulary-view
type: ui
title: Vocabulary View
---

Users manage business terms, system terms, database names, API names, and aliases.

```yaml
ui:
  root:
    kind: view
    id: vocabulary-view
    children:
      - kind: term-editor
        item: term:vocabulary
      - kind: relationship-term-editor
        item: term:relationship-vocabulary
```
