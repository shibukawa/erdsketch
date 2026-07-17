---
id: data:guided-tour-progress
type: data
title: Guided Tour Progress
---

Browser-local state controls automatic guided-tour replay independently from project content.

```yaml
fields:
  surface_id: stable guide identifier
  guide_version: positive integer
  outcome:
    values:
      - completed
      - skipped
  updated_at: timestamp
identity:
  - surface_id
  - guide_version
persistence: browser_local_storage
scope: browser_profile
rules:
  - Completed and skipped suppress automatic replay only for the same surface and guide version.
  - A higher guide version is eligible for one new automatic presentation.
  - Temporary close writes no outcome.
  - Manual replay does not clear or downgrade the stored outcome.
  - Storage failure leaves tours manually replayable and must not block the surface.
  - State is excluded from data:project and data:portable-project-archive.
```
