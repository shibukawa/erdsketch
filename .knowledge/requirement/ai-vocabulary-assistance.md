---
id: requirement:ai-vocabulary-assistance
type: requirement
title: AI Vocabulary Assistance
---

Users receive contextual naming candidates while deterministic mappings and human approval remain authoritative.

```yaml
resolution_pipeline:
  - step: exact_match
    mechanism: deterministic
    action: reuse_confirmed_entry
  - step: alias_match
    mechanism: deterministic
    action: propose_existing_entry
  - step: composed
    mechanism: rules_then_ai
    action: propose_composed_names
  - step: similar_concept
    mechanism: ai
    action: rank_related_entries
  - step: new_concept
    mechanism: ai
    action: propose_new_entry
ai_input:
  - incomplete data:vocabulary-entry
  - small_relevant_subset_of_confirmed_entries
  - containing data:entity
  - nearby data:attribute names
ai_output:
  schema: data:vocabulary-suggestion
  structured: true
  fills:
    - system_name
    - physical_name
interaction:
  alternatives_visible: true
  rationale_visible: true
  confidence_use: candidate_order_only
  actions:
    accept:
      interaction: click_suggestion
      result: confirmed data:vocabulary-entry
      reusable_without_ai: true
    edit_then_accept:
      result: confirmed data:vocabulary-entry
      reusable_without_ai: true
    reject:
      result: no_catalog_change
runtime:
  preferred: capability_detected_on_device_browser_model
  compatible_example: browser_prompt_api
  fallback: manual_and_deterministic_workflow
  send_entire_catalog: false
constraints:
  - Known mappings and naming rules run before AI.
  - AI never silently overwrites confirmed names.
  - Missing on-device AI never blocks vocabulary editing or DDL preparation.
  - Only accepted suggestions are promoted into reusable vocabulary.
  - Suggestions remain visually distinct until clicked.
acceptance:
  - An incomplete business name can receive system and physical name candidates.
  - Context distinguishes identical words used for different domain meanings.
  - Users can inspect alternatives and rationale before approval.
  - Repeated accepted mappings resolve without invoking AI.
```
