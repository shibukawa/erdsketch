---
id: requirement:vocabulary-alias-correction
type: requirement
title: Vocabulary Alias Correction
---

Alias matching detects non-preferred wording and guides explicit replacement with the entry business name.

```yaml
trigger:
  source: data:vocabulary-binding
  condition: any_segment_match_kind_alias
semantics:
  alias: discouraged_or_incorrect_term
  preferred_term: data:vocabulary-entry business_name
  readiness: same_as_unregistered
usage_state:
  projection: data:vocabulary-usage
  status: correction_required
  color: red
guidance:
  show:
    - matched_alias
    - preferred_business_name
    - source_name_preview_after_replacement
  message: replace_alias_with_preferred_term
action:
  initiation: user_click
  mutation:
    target: owning data:entity, data:attribute, or data:data-domain source name
    replace: alias_matched_span_only
    preserve:
      - surrounding_text
      - unaffected_segment_order
  after: requirement:vocabulary-cache-maintenance alias_correction_applied
constraints:
  - Alias matching may derive system and physical previews from the matched entry.
  - Preview output never makes alias use complete or valid.
  - Correction is never applied automatically.
  - One action replaces only the selected alias occurrence.
  - Unmatched text keeps unmatched precedence while alias guidance remains available.
acceptance:
  - Alias use in a table, field, or domain name is shown as red correction-required usage.
  - The row identifies both the used alias and preferred business name.
  - Clicking replacement updates only the selected occurrence in the model source name.
  - Dismissing guidance leaves the source name unchanged and not complete.
  - After replacement, the changed owner is rematched and may become incomplete or complete.
```
