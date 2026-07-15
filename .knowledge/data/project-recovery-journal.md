---
id: data:project-recovery-journal
type: data
title: Project Recovery Journal
---

Project recovery journal durably records host-accepted project mutations between complete checkpoints.

```yaml
location: system:origin-private-project-store
scope:
  owner: actor:session-host
  key:
    - origin
    - project_id
records:
  ordered_by: host_sequence
  required:
    - format_version
    - project_id
    - host_sequence
    - message_id
    - operation
    - previous_checksum
    - checksum
excludes:
  - cursor_presence
  - transient_selection
  - connection_status
integrity:
  replay: last_contiguous_valid_record
  corrupt_or_partial_tail: ignore_and_report
  duplicate_message_id: apply_once
compaction:
  prerequisite: newer_data:project-document-set_checkpoint_verified
  action: remove_only_records_covered_by_checkpoint
```
