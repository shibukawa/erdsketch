---
id: system:ai-model-provider
type: system
title: AI Model Provider
---

AI model provider isolates advice workflows from runtime-specific model APIs.

```yaml
request:
  fields:
    - task
    - system_prompt
    - context_json
    - expected_output_schema
response:
  fields:
    - partial_text_stream
    - structured_output
    - provider_diagnostics
capabilities:
  - availability
  - structured_output
  - context_limit
  - cancellation
  - streaming
initial_adapters:
  - decision:initial-browser-ai-runtime
  - system:local-openai-compatible-provider
future_adapters:
  - Copilot SDK
  - Codex SDK
  - Foundation Models
constraints:
  - Provider credentials and configuration never enter model context.
  - Provider errors do not mutate project data.
  - Workflows depend on this port, not a concrete SDK.
  - AI execution follows permission:personal-ai-execution.
```
