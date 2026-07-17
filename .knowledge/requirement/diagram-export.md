---
id: requirement:diagram-export
type: requirement
title: Editable Diagram Export
---

Users export selected project diagrams as editable draw.io XML.

```yaml
format:
  media: draw.io XML
  extension: .drawio
catalog:
  items:
    - every data:dfd-canvas
    - every ERD canvas from ui:erd-sketch-canvas
    - project CRUD matrix from requirement:crud-matrix-reporting
  selection:
    multiple: true
    select_all: true
render_options:
  defaults:
    source: current ui:model-card-display-mode
    capture: when ui:export-dialog opens
  name_mode:
    required: true
    independently_switchable: true
    values:
      - business_name
      - system_name
      - physical_name
    behavior: requirement:name-display-switching
  model_card_content:
    required_for: ERD
    independently_switchable: true
    values:
      - primary_keys
      - description
    source: ui:model-card-display-mode
output:
  one_file_per_selected_item: true
  full_diagram_bounds: true
  preserve:
    - labels
    - shapes
    - connections
    - groups
    - CRUD axis orientation and ordering
acceptance:
  - DFD, ERD, and CRUD items are listed with type, project name, and canvas or report name.
  - The exported XML opens in draw.io without repair.
  - Exported cells and connectors remain editable draw.io elements, not one flattened bitmap.
  - Name and card-content choices affect only export presentation.
  - Initial name and card-content choices match the current canvas card display settings.
  - Export choices may diverge from canvas settings without mutating the canvas.
  - Missing selected names use the visible missing-name behavior and do not block diagram export.
```
