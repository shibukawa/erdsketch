---
id: rule:dfd-model-scope
type: rule
title: DFD Model Scope
---

```yaml
usage_scope:
  shared:
    dfd: allowed
    erd: allowed
  dfd_only:
    display_label: DFD only
    dfd: allowed
    erd: forbidden
dependency:
  allowed_on_dfd:
    - independent
    - dependent
  selection_default: ui:dfd-model-picker-dialog filters to independent
constraints:
  - DFD models do not require direct logical-to-physical code correspondence.
  - Current-system analysis may begin with physical models.
  - DFD-only models remain searchable in data:model-catalog but are excluded from ERD placement.
  - Dependent models are valid on DFD and never produce a dependency warning.
```
