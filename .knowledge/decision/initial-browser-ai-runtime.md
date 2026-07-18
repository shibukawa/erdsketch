---
id: decision:initial-browser-ai-runtime
type: decision
title: Initial Browser AI Runtime
---

The first AI implementation targets Chrome and an on-device Gemini Nano compatible browser model.

```yaml
initial:
  browser: Chrome
  runtime: built_in_on_device_model
  compatible_model: Gemini Nano
  transport: browser_model_api
  generation_api: promptStreaming
  network_required: false
  capability_detection: required
fallback:
  unavailable: hide_or_disable_ai_actions_with_reason
  core_modeling: remains_available
constraints:
  - No server component is required for initial AI advice.
  - Model download and runtime availability are browser-managed prerequisites.
  - Browser-specific calls remain behind system:ai-model-provider.
future:
  providers:
    - OpenAI-compatible API
    - Copilot SDK
    - Codex SDK
    - Foundation Models
```
