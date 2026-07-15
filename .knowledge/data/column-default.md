---
id: data:column-default
type: data
title: Column Default
---

Column default stores portable default-value intent without accepting arbitrary SQL expressions.

```yaml
kinds:
  - none
  - literal
  - current_date
  - current_timestamp
literal_types:
  - string
  - number
  - boolean
fields:
  - kind
  - literal_value
rules:
  - literal_value is present only when kind is literal.
  - Literal type must be compatible with the effective projected column type.
  - Arbitrary expressions use data:ddl-extension-text.
```
