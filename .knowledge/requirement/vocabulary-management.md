---
id: requirement:vocabulary-management
type: requirement
title: Vocabulary Management
---

Users define project vocabulary first, then bind it to table, field, and domain names.

```yaml
requirements:
  scope:
    owner: data:project
    cardinality_per_project: one
    shared_by_all_erd_and_dfd_canvases: true
  editing:
    surface: ui:vocabulary-view
    tab: word_list
    default_mode: selection_only_list
    selected_entry_editor: details_sidebar
    bulk_mode: explicit_bulk_settings_action
    placeholders: none
    creation_required_field: business_name
    deferred_fields:
      - system_name
      - physical_name
    primary_columns:
      - business_name
      - system_name
      - physical_name
  model_binding:
    targets:
      - data:entity
      - data:attribute
      - data:data-domain
    reference: data:vocabulary-binding
    source: data:vocabulary-entry
    rename_propagation: supported
    local_override: unmatched_segment_only
  details:
    fields:
      - meaning
      - notes
      - aliases
      - usage_list: data:vocabulary-usage
    quick_fill: requirement:vocabulary-quick-fill
  text_assistance:
    fields:
      - business_name
      - system_name
    spellcheck: true
    lang: selected_language
  display:
    behavior: requirement:name-display-switching
    modes:
      business: business_name
      system: system_name
      physical: physical_name
      system_and_physical:
        - system_name
        - physical_name
  ddl:
    source: physical_name
    required_before_generation: true
    naming_policy: rule:sql-naming-policy
  lookup: rule:vocabulary-resolution
  usage_inspection: requirement:vocabulary-usage-inspection
  unmatched_registration: requirement:vocabulary-segmentation-registration
  unmatched_presentation: requirement:unmatched-name-presentation
  alias_correction: requirement:vocabulary-alias-correction
  assisted_completion: requirement:ai-vocabulary-assistance
  workflow: flow:vocabulary-first-naming
  cache: requirement:vocabulary-cache-maintenance
acceptance:
  - A non-developer can understand the primary table without opening row details.
  - Opening the word list shows selectable rows rather than a wall of text boxes.
  - Meaning, notes, aliases, and usage are available for the selected entry.
  - Quick fill completes missing technical names without replacing confirmed values.
  - Bulk settings preserves efficient editing of many entries without becoming the default view.
  - Vocabulary entries remain available before any table, field, or domain uses them.
  - A Japanese system name and romanized physical name can coexist.
  - The diagram can switch naming modes without changing model identity.
  - DDL never uses business_name or system_name as an implicit fallback.
  - Unregistered text is never normalized into an implicit physical name.
  - AI suggestions never become confirmed mappings without user approval.
  - Alias use is not treated as valid vocabulary completion.
  - Rendering never performs vocabulary matching.
```
