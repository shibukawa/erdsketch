---
id: flow:request-ai-design-advice
type: flow
title: Request AI Design Advice
---

User requests task-specific advice for a selected model scope without changing the project.

```yaml
actors:
  - user
  - application
  - system:ai-model-provider
steps:
  - actor: user
    action: open ui:ai-assistant-chat-window from current surface
  - actor: user
    action: enter instruction or question
  - actor: application
    action: detect_provider_capability
  - actor: application
    action: build data:ai-review-context from visible chat context and selected targets
  - actor: application
    action: combine_conversation_instruction_context_and_output_schema
  - actor: system:ai-model-provider
    action: generate data:ai-design-advice
  - actor: application
    action: show_animated_thinking_then_stream_partial_answer
  - actor: application
    action: validate_output_and_target_ids
  - actor: application
    action: show_summary_suggestions_rationale_tradeoffs_and_alternatives
failure:
  provider_unavailable: explain_unavailability_and_keep_manual_workflow
  generation_error: preserve_project_and_allow_retry
  invalid_output: show_non_destructive_error
constraints:
  - Each request has one explicit user message.
  - Initial requests use decision:initial-browser-ai-runtime or system:local-openai-compatible-provider.
  - Prompts treat project text as untrusted data, not instructions.
  - No step changes project data.
  - Each participant executes under permission:personal-ai-execution.
  - Opening chat never sends project context; sending occurs only after explicit message submission.
acceptance:
  - User can ask a free-form modeling question and receive an answer in chat.
  - User can request field type recommendations for selected attributes.
  - User can request model split recommendations for a selected model.
  - Advice identifies targets by stable id and explains its rationale.
  - Cancel or failure leaves the project byte-equivalent to its pre-request state.
```
