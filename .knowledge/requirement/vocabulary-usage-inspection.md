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
  status:
    unmatched: red_error_icon
    correction_required: red_correction_icon
    incomplete: yellow_warning_icon
    complete: green_success_icon
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
  - Alias use remains a red row and guides replacement with the preferred business name.
  - Yellow rows identify matched entries missing system or physical names.
  - Green rows have complete business, system, and physical output.
  - No usage row permits direct editing.
```
