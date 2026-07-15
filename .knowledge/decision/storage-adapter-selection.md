---
id: decision:storage-adapter-selection
type: decision
title: Storage Adapter Selection
---

Runtime capability and user choice select a storage adapter behind one project persistence contract.

```yaml
selection:
  go_backend_mode:
    primary: system:native-project-file-adapter
    continuous_recovery: system:origin-private-project-store
    portable_exchange: data:portable-project-archive
  static_content_mode:
    preferred_when_user_selects_external_location: system:browser-local-file-adapter
    default: system:origin-private-project-store
    continuous_recovery: system:origin-private-project-store
    portable_exchange: data:portable-project-archive
rules:
  - Detect capabilities at runtime.
  - Keep adapter selection outside modeling and collaboration logic.
  - Preserve data:project-document-set semantics across adapters.
  - A failed preferred adapter may fall back only with visible user confirmation.
  - OPFS recovery remains enabled when native or browser-local external storage is selected.
  - Storage destination choice is presented by ui:project-management-dialog tabs.
browser_policy:
  chromium_with_picker_API:
    external_folder: read_write
  safari:
    external_folder: no_persistent_read_write_handle
    import: file_or_directory_selection_when_supported
    export:
      artifact: data:portable-project-archive
      delivery: browser_download
    recovery: system:origin-private-project-store
    UI:
      file_system_tab: unavailable_with_explanation_when_picker_API_is_missing
      archive_exchange: origin_private_storage_tab
initial_seeds:
  go_backend_mode: system:native-project-file-adapter
  static_content_mode: bundled_static_seed_documents
```
