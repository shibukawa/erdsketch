---
id: rule:dfd-group-flow-restoration
type: rule
title: DFD Group Flow Restoration
---

Separating data:dfd-overlap-group restores the pre-grouping data:data-flow set when safe and never leaves duplicate arrows for one directed endpoint pair.

```yaml
grouping_snapshot:
  capture: immediately_before_group_creation
  contents:
    - original_flows
    - expanded_flow_count
  lifetime: runtime_only
  persistence: excluded
ungroup:
  restore_snapshot_when:
    - snapshot_exists
    - current expanded flow count equals snapshot expanded flow count
    - snapshot endpoints still belong to the separated members
  otherwise:
    expand: rule:dfd-group-flow-expansion
    deduplicate_by:
      - source placement
      - destination placement
    direction_sensitive: true
    maximum_flows_per_key: 1
constraints:
  - Snapshot restoration preserves the exact pre-grouping arrows and their flow attributes.
  - A flow added or removed while grouped disables snapshot restoration.
  - Fallback expansion must collapse flows with the same directed source and destination into one arrow.
  - Opposite directions are different endpoint pairs and may each retain one arrow.
  - The transient snapshot is optional project state and is not required in saved or exported project data.
```
