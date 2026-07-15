---
id: rule:canvas-annotation-semantics
type: rule
title: Canvas Annotation Semantics
---

Visual annotations communicate discussion intent and remain separate from executable modeling semantics.

```yaml
rules:
  annotation_arrow:
    not_equivalent_to:
      - data:relationship
      - data:data-flow
    attachment_effect: follow_endpoint_geometry_only
  background_boundary:
    purpose:
      - subsystem_outline
      - discussion_scope
      - visual_group
    containment: visual_only
    move_enclosed_items: false
    layer: behind_modeling_items
  sticky_note:
    affects_model_definition: false
  freehand_stroke:
    affects_model_definition: false
  promotion:
    implicit: forbidden
constraints:
  - Annotation appearance must remain distinguishable from model relationships and DFD flows.
  - Annotation selection and z-order changes cannot obscure modeling items permanently.
  - Canvas validation ignores annotations.
  - Annotation labels may use informal vocabulary without registering project terms.
```
