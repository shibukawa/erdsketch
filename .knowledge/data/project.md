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
    - model_catalog: data:model-catalog
    - crud_assignments: data:crud-assignment
    - settings: ui:project-settings-view
  collections:
    - erd_canvases: ui:erd-sketch-canvas
    - dfd_canvases: data:dfd-canvas
constraints:
  - Every project has exactly one domain dictionary.
  - Every project has exactly one vocabulary.
  - Every project has exactly one model catalog.
  - CRUD assignments cover project process units and model definitions across all DFD canvases.
  - All ERD canvases reuse the project model catalog, domain dictionary, and vocabulary.
  - All DFD canvases reuse the project model catalog, domain dictionary, and vocabulary.
  - Dictionary changes are visible across every canvas in the project.
```
