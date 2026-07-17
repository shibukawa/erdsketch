---
id: data:starter-project-template
type: data
title: Starter Project Template
---

Starter project template is an immutable bundled blueprint cloned into a new data:project from ui:workspace-start-panel.

```yaml
contract: data:project-document-set
catalog:
  - data:todo-starter-project
  - data:blog-starter-project
  - data:help-desk-starter-project
required_content:
  - project_metadata
  - data:model-catalog
  - data:entity attributes and data:relationship definitions
  - defined data:data-domain entries
  - confirmed data:vocabulary-entry entries
  - complete data:vocabulary-binding coverage
  - at_least_one_erd_canvas
  - at_least_one_data:dfd-canvas
  - canvas_placements
  - settings
instantiation:
  - allocate_new_project_id
  - deep_clone_template_documents
  - remove_template_identity
  - validate_complete_data:project-document-set
  - persist_as_recoverable_temporary_project
  - leave_template_immutable
source_evidence:
  reference: https://github.com/prisma/database-schema-examples/tree/main/postgres
  use: relational_schema_breadth_and_postgresql_friendly_types
  copying: none_required
constraints:
  - Runtime startup never downloads template content.
  - A template is not listed as a user-owned saved project.
  - Editing an instantiated project never changes the bundled template.
  - Every model, attribute, and domain name resolves without unmatched segments under rule:vocabulary-resolution.
  - Every domain used by an attribute has definition_state defined.
  - Template selection does not select ERD or DFD.
```
