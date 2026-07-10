---
id: term:vocabulary
type: term
title: Vocabulary
---

Vocabulary maps business terms, system terms, database names, API names, and aliases.

```yaml
fields:
  - business_name
  - system_name
  - database_name
  - api_name
  - aliases
example:
  business: Customer
  business_aliases:
    - Customer
    - Client
    - TradingPartner
  system: Customer
  database: customers
  api: Customer
related:
  - ui:vocabulary-view
```
