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
  - data:vocabulary-ai-settings
ai_output:
  schema: data:vocabulary-suggestion
  structured: true
  streaming:
    granularity: one_entry_result
    render: append_candidates_to_matching_row
interaction:
  surface: ui:vocabulary-view word-list
  chat_window: forbidden
  batch_trigger: AI suggest
  alternatives_visible_in_each_row: true
  rationale_visible: true
  confidence_use: candidate_order_only
  actions:
    accept:
      interaction: accept_candidate
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
  - Target system_name or physical_name and naming rules come from data:vocabulary-ai-settings.
  - Structured output streams incrementally rather than waiting for the full batch.
  - AI never silently overwrites confirmed names.
  - Missing on-device AI never blocks vocabulary editing or DDL preparation.
  - Only accepted suggestions are promoted into reusable vocabulary.
  - Suggestions remain visually distinct until clicked.
acceptance:
  - An incomplete business name can receive system and physical name candidates.
  - A user chooses system or physical naming and naming rules before starting a batch.
  - Suggestions appear progressively in their vocabulary rows with accept and reject actions.
  - Context distinguishes identical words used for different domain meanings.
  - Users can inspect alternatives and rationale before approval.
  - Repeated accepted mappings resolve without invoking AI.
```
