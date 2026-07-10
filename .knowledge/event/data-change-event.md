---
id: event:data-change-event
type: event
title: Data Change Event
---

Data change event records what causes data to be created, updated, deleted, synchronized, or projected.

```yaml
event_types:
  - command
  - domain_event
  - integration_event
  - lifecycle_event
  - synchronization_event
fields:
  - name
  - trigger
  - affected_data
  - produced_by
  - consumed_by
  - payload
  - timing
examples:
  - OrderConfirmed creates Order.
  - OrderShipped changes Order state.
  - CustomerUpdated projects Customer to Search Index.
related:
  - data:data-flow
  - data:state-transition
```
