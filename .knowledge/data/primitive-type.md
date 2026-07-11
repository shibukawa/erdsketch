---
id: data:primitive-type
type: data
title: Primitive Type
---

Primitive type is a generic storage-neutral base type available in the domain dictionary.

```yaml
kinds:
  integer:
    widths_bits:
      - 8
      - 16
      - 32
      - 64
    aliases:
      64: bigint
    options:
      - signed
      - unsigned
  decimal:
    parameters:
      - precision
      - scale
  floating_point:
    widths_bits:
      - 32
      - 64
  varchar:
    parameters:
      - length
  text: {}
  blob: {}
  date: {}
  time: {}
  datetime: {}
  datetime_with_timezone: {}
  boolean: {}
  uuid: {}
constraints:
  - Primitive types are generic built-in data:data-domain entries.
  - Storage-specific types are chosen only during projection or export.
```
