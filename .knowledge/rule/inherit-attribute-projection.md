---
id: rule:inherit-attribute-projection
type: rule
title: Inherit Attribute Projection
---

An inherit relationship produces a child SQL table containing every effective parent attribute in addition to the child's own attributes.

```yaml
applies_to: data:relationship.kind_inherit
direction:
  source: child
  target: parent
physical_projection:
  child_table:
    columns:
      - all_effective_parent_attributes
      - child_own_attributes
  parent_table_copy: false
  relationship_constraint: none
transitive_inheritance:
  enabled: true
  order: root_parent_to_child
conflicts:
  duplicate_physical_column_name: export_error
  incompatible_redefinition: export_error
cycles: export_error
metadata:
  preserve_attribute_origin: true
  inherited_origin: parent_attribute_id
invariants:
  - Editing a parent attribute changes the next child-table projection.
  - Inherited columns are generated during physical projection and are not duplicated as child-owned logical attributes.
  - Presentation visibility never changes inherited SQL columns.
```

Related data:relationship and data:model-transformation.
