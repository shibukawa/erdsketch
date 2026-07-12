---
id: data:code-set
type: data
title: Code Set
---

Code set is a reusable named-value vocabulary backed by one scalar storage type.

```yaml
fields:
  - name: base_type
    type: data:primitive-type
    allowed:
      - varchar
      - decimal
      - integer
  - name: entries
    type: ordered_list
entry:
  fields:
    - name: name
      type: text
    - name: value
      type: base_type
constraints:
  - Entry name is human-facing; value is the persisted scalar.
  - Entry values conform to the selected base_type.
  - Entry order is explicit and user-controlled.
  - Code set is not a database-native enum.
  - Physical projection uses base_type and never emits a native enum type.
```

