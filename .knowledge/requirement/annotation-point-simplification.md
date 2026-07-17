---
id: requirement:annotation-point-simplification
type: requirement
title: Simplify Annotation Point Sequences
---
Pen strokes and background boundaries remove redundant sampled points while preserving visible geometry in data:canvas-annotation.

```yaml
trigger:
  pen_stroke: pointerup before appending to flow:multi-stroke-annotation-drawing draft
  background_boundary: pointerup before annotation commit
rules:
  - merge consecutive points within a small screen-space distance
  - simplify remaining points with a tolerance-based algorithm
  - preserve each pen stroke endpoint
  - preserve boundary closure and at least 3 vertices
quality:
  - tolerance is stable across zoom levels
  - simplification is deterministic for identical input
  - visible deviation stays within configured tolerance
```
