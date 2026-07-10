---
id: flow:modeling-lifecycle
type: flow
title: Modeling Lifecycle
---

This flow describes the intended design process from business knowledge to deployed storage design.

```yaml
flow:
  trigger: User starts from business knowledge in vision:modeling-workbench.
  steps:
    - id: start-from-dfd
      action: apply flow:dfd-first-modeling to avoid inheriting current system shape
    - id: capture-business-knowledge
      action: define terms using term:vocabulary
    - id: create-candidates
      action: create candidates through requirement:entity-management
    - id: explore-patterns
      action: browse concept:design-pattern-catalog through concept:intent-based-navigation
    - id: add-attributes
      action: add data:attribute to data:entity
    - id: extract-reusable-concepts
      action: define data:value-object and data:data-domain
    - id: normalize
      action: apply requirement:normalization-support
    - id: transform
      action: apply data:model-transformation and preserve semantic metadata
    - id: define-relationships
      action: define data:relationship
    - id: define-lifecycle
      action: define data:data-lifecycle and policy:deletion-policy
    - id: estimate-volume
      action: define data:volume-estimate and data:query-profile
    - id: design-storage
      action: define data:concept-projection and data:data-flow
    - id: define-boundaries
      action: define data:system-boundary-pattern and data:data-ownership
    - id: review
      action: run requirement:ai-review
  invariant: requirement:design-decision-history records changes.
```
