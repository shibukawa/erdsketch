---
id: data:composition-relationship
type: data
title: Composition Relationship
---

Composition is a named whole-part data:relationship with exclusive lifecycle ownership. The owner contains the child; the child is deleted with the owner.

Its relational deletion action is data:referential-action, constrained by policy:deletion-policy; document and search projections target system:storage-target.

```yaml
kind: composition
endpoints:
  owner:
    role: whole
    notation: filled_black_diamond
  child:
    role: part
name:
  required: true
  meaning: owner_field_name
  multiplicity_effect:
    to_one: single_child_field
    to_many: child_collection_field
ownership:
  child_owner_count: exactly_one
  lifecycle_dependency: child_cannot_outlive_owner
projection:
  relational:
    foreign_key: child_to_owner_primary_key
    on_delete: cascade
    field_name_base: relationship_name
  document:
    location: owner_document
    field_name: relationship_name
    value: embedded_child_or_child_collection
  search_index:
    targets:
      - Elasticsearch
      - OpenSearch
    location: owner_document
    field_name: relationship_name
    value: child_object_or_child_object_array
invariants:
  - The filled black diamond is rendered only at the owner endpoint.
  - Relationship name resolves to one valid field name for each export target.
  - Relational export cannot weaken cascade deletion for composition.
  - Non-relational export preserves child containment under the named owner field.
```
