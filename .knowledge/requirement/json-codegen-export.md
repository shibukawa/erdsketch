---
id: requirement:json-codegen-export
type: requirement
title: JSON Code Generation Export
---

Users export a machine-readable project model alone or together with its exact JSON Schema.

```yaml
package_mode:
  required: true
  options:
    json_only:
      format: JSON
      extension: .codegen.json
      files:
        - project.codegen.json
    json_and_schema:
      format: ZIP
      extension: .erdsketch-codegen.zip
      files:
        - project.codegen.json
        - erdsketch-codegen.schema.json
files:
  data:
    path: project.codegen.json
    media: application/json
    model: data:codegen-exchange-model
    included_in:
      - json_only
      - json_and_schema
  schema:
    path: erdsketch-codegen.schema.json
    media: application/schema+json
    dialect: JSON Schema Draft 2020-12
    included_in:
      - json_and_schema
data_document:
  $schema: urn:erdsketch:schema:codegen:1
  formatVersion: 1
schema_document:
  $schema: https://json-schema.org/draft/2020-12/schema
  $id: urn:erdsketch:schema:codegen:1
  additionalProperties: false
  definitions: reusable records for every exported concept
selection:
  models:
    default: all project models
  dependency_closure:
    include_referenced_domains: true
    include_relationship_endpoints: true
    include_related_processes_and_crud: true
validation:
  before_generation:
    - every id is unique in its scope
    - every reference resolves inside the exported dependency closure
    - domains expand without missing components or cycles
    - relationship key arity and types are compatible
    - composition ownership paths are unambiguous and acyclic
    - generated data validates against the generator's matching versioned schema
  failure:
    diagnostic: data:export-diagnostic
    block_generation: true
versioning:
  schema_and_data_version_match: required
  breaking_change: increment formatVersion and schema $id
  additive_change_within_version: forbidden unless schema already permits it
output:
  deterministic: true
  pretty_print: two_space_indent
  utf8: true
  final_newline: true
acceptance:
  - JSON-only mode downloads exactly one project.codegen.json file.
  - JSON-and-Schema mode downloads one ZIP containing exactly the data JSON and matching schema JSON.
  - In JSON-and-Schema mode, project.codegen.json validates with the bundled schema without network access.
  - Both modes produce identical project.codegen.json bytes from the same snapshot and selection.
  - The data JSON contains no editor-only or collaboration-only state.
  - Code generators can trace every model, field, column, domain, relationship, process, flow, and CRUD assignment to a stable source id.
  - Repeating export from the same snapshot and selection produces byte-identical files.
```
