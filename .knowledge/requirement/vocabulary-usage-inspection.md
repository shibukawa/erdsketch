---
id: requirement:vocabulary-usage-inspection
type: requirement
title: Vocabulary Usage Inspection
---

Users inspect vocabulary coverage by model area without editing through the usage projection.

```yaml
surface: ui:vocabulary-view
tab: usage
navigation:
  root_choices:
    - tables
    - domains
  tables:
    selection: one data:entity
    result:
      - selected_table_usage
      - every_child data:attribute usage
  domains:
    selection: domain_collection
    result: every data:data-domain usage
rows:
  item: data:vocabulary-usage
  editable: false
  primary_indicator:
    max_visible: 1
    priority:
      - unregistered: red
      - missing_system_name: orange_squiggle
      - missing_physical_name: yellow_squiggle
      - alias_match: purple
      - complete: green_success_icon
actions:
  unmatched_row:
    open: ui:vocabulary-registration-dialog
  correction_required_row:
    show: alias_and_preferred_business_name
    apply: requirement:vocabulary-alias-correction
acceptance:
  - Selecting a table shows its name and all field names.
  - Selecting domains shows the domain list.
  - Unregistered text remains visible in red rows.
  - System and physical previews show unmatched spans in red without snake_case conversion.
  - Alias matches are purple and guide replacement with the preferred business name.
  - Missing system names use orange squiggles.
  - Missing physical names use yellow squiggles.
  - Each row shows exactly one highest-priority indicator.
  - Green rows have complete business, system, and physical output.
  - No usage row permits direct editing.
```
