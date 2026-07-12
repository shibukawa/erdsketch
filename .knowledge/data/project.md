---
id: data:project
type: data
title: Modeling Project
---

Project is the ownership boundary for shared dictionaries and multiple modeling canvases.

```yaml
owns:
  singleton:
    - domain_dictionary: requirement:domain-dictionary-management
    - vocabulary: requirement:vocabulary-management
    - settings: ui:project-settings-view
  collections:
    - erd_canvases: ui:erd-sketch-canvas
    - dfd_canvases: data:dfd-canvas
constraints:
  - Every project has exactly one domain dictionary.
  - Every project has exactly one vocabulary.
  - All ERD and DFD canvases in the project reuse both dictionaries.
  - Dictionary changes are visible across every canvas in the project.
```
