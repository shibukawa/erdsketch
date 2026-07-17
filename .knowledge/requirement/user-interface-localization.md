---
id: requirement:user-interface-localization
type: requirement
title: User Interface Localization
---

Users operate every workspace mode in Japanese or English without changing project data.

```yaml
locales:
  supported:
    - ja
    - en
  initial: saved_preference_else_browser_language_else_en
  switching:
    surfaces:
      - ui:language-selector in ui:workspace-start-panel
    immediate: true
  persistence: browser_local_storage
scope:
  translate:
    - navigation
    - actions
    - labels
    - guidance
    - validation_and_error_messages
    - accessibility_names
  preserve:
    - project_content
    - user_entered_names
    - technical_identifiers
    - portable_project_archive
fallback:
  missing_translation: en
  invalid_saved_locale: browser_language_else_en
terminology:
  table_type:
    independent:
      canonical_en: Parent table
      localization_key: table_type.parent
    dependent:
      canonical_en: Dependent table
      localization_key: table_type.dependent
  model_state:
    seed_model:
      canonical_en: Seed Model
      localization_key: model_state.rough
    conceptual_model:
      canonical_en: Conceptual Model
      localization_key: model_state.concept
    logical_model:
      canonical_en: Logical Model
      localization_key: model_state.logical
    matured_model:
      canonical_en: Matured Model
      localization_key: model_state.completed
accessibility:
  document_language_matches_selection: true
  selector_has_accessible_name: true
acceptance:
  - Japanese and English can be selected from ui:workspace-start-panel.
  - ERD and DFD workspace headers do not show a language selector.
  - Selection applies immediately and survives reload.
  - First visit follows Japanese browser preference; other languages use English.
  - Invitation and participant-recovery routes that bypass the panel use the saved preference, then browser language, then English.
  - Changing locale never mutates or persists project data.
  - Known UI text, dialog text, alerts, and accessibility labels use the selected locale.
  - Missing Japanese text remains usable through English fallback.
```
