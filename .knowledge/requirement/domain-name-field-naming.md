---
id: requirement:domain-name-field-naming
type: requirement
title: Domain Name Field Naming
---

An attribute may derive its effective name by suffixing its assigned domain name.

```yaml
field_editor:
  availability: domain_is_assigned
  control:
    kind: checkbox
    label: Use domain name
    default: false
  effective_name:
    unchecked: entered_name
    checked: concatenate_entered_name_and_domain_name
    separator: none
    canvas_card: effective_name
  validation:
    entered_name_empty:
      allowed_when: checkbox_checked_and_domain_assigned
      effective_name: domain_name
    otherwise: reject_empty_name
quick_entry:
  input: ui:field-list-dialog.field-quick-entry
  placeholder: Type a field name and press Enter or drop Domain,
  domain_drop:
    source: ui:domain-dictionary-dialog
    result:
      create: data:attribute
      entered_name: preserve_current_input
      domain: dropped_domain
      use_domain_name: true
    postcondition: created_attribute_uses_effective_name
example:
  domain_name: CreatedAt
  entered_name: Article
  use_domain_name: true
  effective_name: ArticleCreatedAt
acceptance:
  - The checkbox is shown only while a domain is assigned.
  - Enabling the checkbox appends the domain name to the entered name without a separator.
  - The canvas card displays the effective name.
  - An empty entered name is valid when the checkbox is enabled and a domain is assigned.
  - With an empty entered name, the effective name equals the domain name.
  - Dropping a domain onto quick entry creates an attribute with that domain and the checkbox enabled.
  - A domain drop preserves any text already present in quick entry as the entered name.
  - Quick entry displays the specified domain-drop placeholder.
related:
  - requirement:field-list-management
  - ui:field-list-dialog
  - data:attribute
  - data:data-domain
```
