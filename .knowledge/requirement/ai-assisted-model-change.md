---
id: requirement:ai-assisted-model-change
type: requirement
title: AI Assisted Model Change
---

Future AI advice may become an explicit proposed model change, but only through human-reviewed application.

```yaml
phase: future
input:
  - data:ai-design-advice
  - current_project_revision
proposal:
  required:
    - target_ids
    - base_revision
    - operations
    - rationale
application:
  preview_required: true
  explicit_user_approval: true
  validation_required: true
  atomic: true
  records_decision: requirement:design-decision-history
  stale_base_revision: reject_and_regenerate
constraints:
  - AI cannot directly invoke project mutation commands.
  - Unsupported or ambiguous advice remains read-only.
  - User can edit or reject a proposal before application.
  - Existing deterministic transformations are reused where applicable.
  - Collaboration participants submit approved proposals through permission:collaboration-session-access and actor:session-host authority.
acceptance:
  - No proposal is applied without a visible diff and explicit approval.
  - Failed validation leaves the project unchanged.
  - Applied changes are undoable through normal project history.
```
