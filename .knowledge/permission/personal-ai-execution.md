---
id: permission:personal-ai-execution
type: permission
title: Personal AI Execution
---

Every collaboration participant may independently request non-mutating AI advice using only their local provider access.

```yaml
holders:
  - actor:session-host
  - actor:session-participant
includes_readonly_participant: true
authority:
  granted_by_host: false
  selected_provider: current_participant
  configured_url_and_model: current_participant
  network_request: current_participant_browser
  result_visibility: current_participant_only
allow:
  - choose_available_provider
  - configure system:local-openai-compatible-provider URL and model
  - send selected data:ai-review-context
  - receive data:ai-design-advice
deny:
  - execute_AI_for_another_participant
  - use_session_host_as_AI_proxy
  - broadcast_provider_configuration
  - broadcast_AI_request_or_result_implicitly
  - mutate_canonical_project_state
change_boundary:
  advice: allowed_without_host
  apply_proposal: requires_edit_permission_and_actor:session-host_acceptance
constraints:
  - permission:collaboration-session-access does not gate read-only AI advice.
  - Host loss or unavailability does not prevent personal AI advice against the participant's current replica.
  - Advice may be stale and must not be treated as a canonical project decision.
```
