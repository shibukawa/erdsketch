---
id: data:codegen-exchange-model
type: data
title: Code Generation Exchange Model
---

Code generation exchange model is a stable, normalized, UI-independent projection of one project.

```yaml
root:
  required:
    - $schema
    - formatVersion
    - project
    - models
    - domains
    - vocabulary
    - relationships
    - processes
    - dataFlows
    - crudAssignments
project:
  fields:
    - id
    - name
models:
  source: data:model-catalog
  fields:
    - stable id
    - business, system, and physical names
    - description and role
    - logical fields
    - domain-expanded physical columns
    - primary and unique constraints
    - indexes and partitioning
domains:
  source: data:data-domain
  include:
    - stable id and all names
    - shape and primitive type
    - parameters and code set
    - recursively resolved components
vocabulary:
  source: data:vocabulary-entry
relationships:
  source:
    - data:relationship
    - data:relationship-reference
    - data:composition-relationship
  normalize:
    - stable endpoint ids
    - multiplicities and direction
    - local and referenced key columns
    - deletion action
    - composition owner and child
processes:
  source: data:dfd-process
dataFlows:
  source: data:data-flow
crudAssignments:
  source: data:crud-assignment
excluded:
  - canvas coordinates and viewport
  - selection, focus, locks, and presence
  - rough rendering state
  - transient caches
  - legacy migration-only fields
constraints:
  - Stable source ids are preserved for generated-code traceability.
  - References use ids, never display labels as identity.
  - Domain-expanded columns retain source model, logical field, domain, and component ids.
  - Arrays and object keys have deterministic ordering.
  - Internal persistence records are projected, not copied.
  - Unknown fields are forbidden within one formatVersion.
```
