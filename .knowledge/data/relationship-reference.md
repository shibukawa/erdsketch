---
id: data:relationship-reference
type: data
title: Relationship Reference
---

Relationship reference is persisted relationship metadata displayed beside attributes without becoming an attribute or model-owned field.

```yaml
fields:
  - name: id
    type: identifier
  - name: relationship_id
    type: reference
    target: data:relationship
  - name: primary_key
    type: boolean
    default: false
  - name: foreign_key
    type: boolean
    default: false
flags:
  independent:
    - primary_key
    - foreign_key
  allowed:
    - neither
    - primary_key_only
    - foreign_key_only
    - primary_key_and_foreign_key
derived_presentation:
  name: data:relationship.name
  target_model: opposite_relationship_endpoint
  icon: chain
  visible_on:
    one_to_many: many_endpoint
    many_to_one: many_endpoint
    one_to_one: arrow_origin_endpoint
    many_to_many: both_endpoints
  ownership_semantics: none
  sort: rule:field-list-sort
persistence:
  collection: relationship_references
  separate_from: attributes
  stable_identity: id
  cardinality_change:
    preserves_record_identity: true
    preserves_flags: true
    changes_projection_only: true
invariants:
  - relationship_id resolves to exactly one existing data:relationship.
  - Exactly one relationship reference record exists per projected relationship.
  - Model visibility is derived from relationship multiplicity and arrow direction, not stored ownership.
  - Relationship name is not duplicated; display reads it from data:relationship.
  - Deleting the relationship deletes its relationship references after confirmation.
  - Persistent inconsistency is a load or save error, never silently repaired.
related:
  - data:relationship
  - data:attribute
  - requirement:field-list-management
  - ui:field-list-dialog
  - rule:field-list-sort
  - requirement:relationship-validation
```
