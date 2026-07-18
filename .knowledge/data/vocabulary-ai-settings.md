---
id: data:vocabulary-ai-settings
type: data
title: Vocabulary AI Settings
---

Vocabulary AI settings define the shared batch naming request for one project.

```yaml
storage:
  file: project.json
  location: root.vocabulary_ai
  shared: all_collaborators
fields:
  - name: target
    type: enum
    values:
      - system_name
      - physical_name
  - name: naming_rules
    type: text
  - name: prompt
    type: text
constraints:
  - Settings are project data rather than browser-local preferences.
  - target determines which empty name field requirement:ai-vocabulary-assistance proposes.
  - naming_rules and prompt are included in every suggestion request.
  - Prompt changes are persisted and shared through project.json.
```
