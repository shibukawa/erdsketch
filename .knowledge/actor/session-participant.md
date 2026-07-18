---
id: actor:session-participant
type: actor
title: Collaboration Session Participant
---

Session participant edits a replicated project view through operation intents accepted by actor:session-host.

```yaml
capabilities:
  - receive current project snapshot
  - submit data:collaboration-message operation intents when permission:collaboration-session-access is edit
  - receive accepted operations and presence
  - keep optimistic UI state that can be rejected or replaced
  - request non-mutating AI advice under permission:personal-ai-execution
restrictions:
  - no canonical operation ordering
  - no authoritative lock ownership decisions
  - no flow:project-load-save execution
```
