---
id: requirement:vocabulary-cache-maintenance
type: requirement
title: Vocabulary Cache Maintenance
---

The application builds vocabulary matches at startup and updates only affected derived output after changes.

```yaml
initialization:
  trigger: data:project opened
  input:
    - every data:entity name
    - every data:attribute name
    - every data:data-domain name
    - all data:vocabulary-entry records
    - rule:sql-naming-policy
  action:
    - apply rule:vocabulary-resolution
    - generate business_system_physical_names
    - materialize data:vocabulary-match-cache
  ui_state: vocabulary_indexing
incremental_updates:
  model_name_changed:
    targets:
      - data:entity
      - data:attribute
      - data:data-domain
    action: rematch_changed_owner_only
  manual_segmentation_changed:
    action: rebuild_changed_owner_only
  alias_correction_applied:
    action: update_source_and_rematch_changed_owner_only
  vocabulary_system_or_physical_changed:
    action: recompute_outputs_for_reverse_indexed_owners
    rematch_boundaries: false
  vocabulary_business_name_or_alias_changed:
    action: rematch_project_name_corpus
    reason: new_longest_match_may_change_any_source
  vocabulary_entry_created_or_deleted:
    action: rematch_project_name_corpus
  naming_policy_changed:
    action: recompute_physical_outputs_for_all_owners
    rematch_boundaries: false
consistency:
  publish: atomic_snapshot
  stale_detection:
    compare:
      - source_revision
      - vocabulary_revision
      - naming_policy_revision
  recovery: rebuild_entire_project_cache
performance:
  display_time_matching: forbidden
  batch_startup_work: true
  coalesce_rapid_edits: true
acceptance:
  - Switching display modes performs no vocabulary matching.
  - Renaming one field rematches only that field.
  - Changing a system or physical term updates only owners using that entry.
  - Adding a longer business term can rematch every project name for correctness.
  - Applying one alias correction rematches only the corrected owner.
  - Cache loss is recovered by startup-equivalent rebuilding.
```
