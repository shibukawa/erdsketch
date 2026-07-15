---
id: system:native-project-file-adapter
type: system
title: Native Project File Adapter
---

Native project file adapter provides project and initial-seed I/O through the Go backend.

```yaml
availability: go_backend_mode
operations:
  - list_projects
  - load_project_as_data:project-document-set
  - save_data:project-document-set
  - load_initial_seed_documents
policy:
  root: explicitly_configured
  logical_paths: traversal_checked
  write_authority: actor:session-host
save:
  behavior: atomic_replace_when_supported
  requirements:
    - write temporary sibling
    - flush and close before replacement
    - preserve previous project on failure
constraints:
  - Native paths remain inside this adapter.
  - system:collaboration-relay does not interpret or retain project content.
```
