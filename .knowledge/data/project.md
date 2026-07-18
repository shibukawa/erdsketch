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
    - vocabulary_ai_settings: data:vocabulary-ai-settings
  collections:
    - erd_canvases: ui:erd-sketch-canvas
    - dfd_canvases: data:dfd-canvas
    - canvas_annotations: data:canvas-annotation
constraints:
  - Every project has exactly one domain dictionary.
  - Every project has exactly one vocabulary.
  - Every project has exactly one model catalog.
  - CRUD assignments cover project process units and model definitions across all DFD canvases.
  - All ERD canvases reuse the project model catalog, domain dictionary, and vocabulary.
  - All DFD canvases reuse the project model catalog, domain dictionary, and vocabulary.
  - Dictionary changes are visible across every canvas in the project.
  - project.json stores data:vocabulary-ai-settings at its root so collaborators share the prompt and naming rules.
  - Each canvas annotation belongs to exactly one ERD or DFD canvas.
```
