---
id: system:local-openai-compatible-provider
type: system
title: Local OpenAI Compatible Provider
---

Local OpenAI compatible provider sends AI requests directly from one participant's browser to a user-specified server URL without credentials.

```yaml
configuration:
  scope: participant_local
  exact_fields:
    - base_url
    - model
  no_other_fields: true
interface:
  controls:
    - base_url_input
    - connection_test
    - model_select
  absent_controls:
    - api_key
    - bearer_token
    - client_secret
    - custom_header
adapter_contract:
  accepts_credentials: false
  accepts_custom_headers: false
  creates_authorization_header: false
model_discovery:
  trigger: explicit_connection_test
  endpoint: GET /v1/models
  request_requires:
    - base_url
  result: model_ids_from_data_array
  selection: dropdown
  initial_state: disabled_until_successful_test
  auto_select: first_model_when_current_selection_is_unavailable
  url_change: clear_discovered_models_and_selection
configuration_distribution:
  project_document: excluded
  collaboration_snapshot: excluded
  invitation: excluded
  host_replication: excluded
execution:
  caller: current_participant_browser
  network_authority: current_participant
  proxy_through_session_host: false
  collaboration_transport: false
  request: system:ai-model-provider
  transport: openai_chat_completions_sse
  request_stream: true
security:
  - No credential input, prompt, property, or adapter parameter exists.
  - Never construct or attach an Authorization header.
  - Reject URLs containing user information.
  - Display the destination origin before the first request and after URL changes.
  - Require explicit participant action before sending project context to a new origin.
  - Reject non-HTTP and non-HTTPS schemes.
  - Treat server output as untrusted data and validate data:ai-design-advice.
failure:
  unreachable_or_browser_blocked: explain_locally_and_keep_project_unchanged
  authentication_required: unsupported_and_never_show_credential_prompt
constraints:
  - URL and model configuration are never shared with other participants.
  - The server receives only data:ai-review-context selected by the current participant.
  - Availability and results may differ between participants.
```
