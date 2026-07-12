---
id: data:create-history-pattern
type: data
title: Create History Model Pattern
---

Move or copy selected state into a transaction/history model with explicit temporal identity.

```yaml
description: Track changes to selected fields over time or versions.
preconditions:
  context: ui:field-list-dialog
  selected_rows_minimum: 1
  source_primary_key_minimum: 1
inputs:
  - history_model_name
  - storage_mode
  - current_model_name_when_storage_mode_is_dedicated_current
  - temporal_key_mode
  - temporal_key_names
storage_modes:
  keep_on_source: selected rows remain on source
  history_only: selected rows are removed from source
  dedicated_current: selected rows are removed from source and copied to a named current model
temporal_key_modes:
  instant: one date or datetime field
  version: one version field
  range: start and end date or datetime fields; only end is a key
actions:
  - create a dependent history model with role history
  - copy source primary keys and selected rows to history
  - create temporal fields and mark the instant, version, or range end field as primary key
  - when storage_mode is not keep_on_source remove selected rows from source
  - when storage_mode is dedicated_current create a dependent current model inheriting the source role and copy selected rows to it
  - when storage_mode is keep_on_source connect history and source with a label relationship whose semantic role is history
  - otherwise connect history to source with an N:1 relationship
  - when selected relationship references remain on source, hide their history-side projections
constraints:
  - History and dedicated current models depend on the source identity and lifecycle.
  - Copied source primary keys retain their key role in history.
  - storage_mode and temporal_key_mode each select exactly one value.
  - temporal key names are unique within history.
  - Range start is not a primary key.
  - Ranges for the same source identity are assumed not to overlap; this pattern does not add overlap enforcement.
```

related:
  - requirement:model-refinement-patterns
  - data:relationship
  - data:relationship-reference
  - data:time-characteristic
  - data:dependent-entity
