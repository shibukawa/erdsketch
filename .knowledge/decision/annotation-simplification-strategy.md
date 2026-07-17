---
id: decision:annotation-simplification-strategy
type: decision
title: Annotation Point Simplification Strategy
---
Use near-point deduplication followed by Ramer-Douglas-Peucker for requirement:annotation-point-simplification.

```yaml
pipeline:
  - convert screen-pixel tolerance to canvas coordinates
  - remove consecutive near-duplicate points
  - run Ramer-Douglas-Peucker per pen stroke or boundary
  - restore required endpoints or polygon closure
rationale:
  - reduces persistence and hit-test cost
  - retains meaningful bends better than distance-only sampling
  - supports deterministic recomputation
```
