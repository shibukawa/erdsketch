---
id: ui:ai-assistant-chat-window
type: ui
title: AI Assistant Chat Window
---

Personal chat window lets a user instruct the selected AI provider and receive contextual modeling advice.

```yaml
ui:
  root:
    kind: assistant-window
    id: ai-assistant-chat
    title: AI assistant
    modality: non_blocking_within_current_surface
    children:
      - kind: context-summary
        id: ai-chat-context
        visible: true
        fields:
          - source_surface
          - selected_model_names
          - selected_attribute_names
          - uncommitted_draft_included
        actions:
          - exclude_optional_context
      - kind: conversation
        id: ai-chat-messages
        message_roles:
          - user
          - assistant
        assistant_content:
          - text
          - data:ai-design-advice cards
          - streaming_partial_text
          - animated_thinking_status
          - error_state
      - kind: composer
        id: ai-chat-composer
        multiline: true
        submit: explicit_send
        actions:
          - send
          - cancel_generation
      - kind: provider-status
        id: ai-chat-provider
        shows:
          - selected_provider
          - selected_model
          - discovered_models
          - availability
          - destination_origin_when_remote
conversation:
  owner: current_participant
  visibility: current_participant_only
  lifetime: current_chat_window
  storage: memory_only
  close_behavior: discard_all_messages
  reload_behavior: discard_all_messages
  reopen_behavior: start_empty_conversation
  context_source: opening_surface_and_current_selection
  context_change: show_changed_context_before_next_send
  project_mutation: none
states:
  no_provider: keep_window_open_and_explain_configuration
  local_models_not_loaded: disable_model_select_and_offer_connection_test
  generating:
    before_first_text: show_animated_thinking_status
    after_first_text: stream_partial_answer_with_active_cursor
    auto_scroll: keep_latest_output_visible
    action: allow_cancel
  failed: preserve_user_message_and_allow_retry
accessibility:
  - New assistant responses are announced without moving focus unexpectedly.
  - Streaming updates use the conversation live region and do not expose private chain-of-thought.
  - Composer, context controls, provider status, and messages are keyboard reachable.
  - Opening and closing restore focus to the invoking ui:dialog-ai-chat-button or ui:canvas-ai-chat-button.
constraints:
  - Chat opening alone sends no model data.
  - Current destination and included context are visible before send.
  - Draft dialog values are labeled as uncommitted when included.
  - Conversation, request, and response are never broadcast implicitly.
  - Conversation history is never persisted to project or participant settings.
  - Advice remains non-authoritative under requirement:ai-review.
```
