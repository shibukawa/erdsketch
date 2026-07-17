---
id: requirement:headless-export-cli
type: requirement
title: Headless Export CLI
---

Users and automation export every supported artifact from canonical project JSON without starting a browser or desktop UI.

```yaml
command:
  executable: erdsketch
  subcommand: export
input:
  flag: --input
  format: data:project-document-set canonical .erdsketch.json
  read_only: true
output:
  directory_flag: --output
  overwrite: explicit_flag_only
formats:
  drawio:
    requirement: requirement:diagram-export
    selector: --format drawio
  document:
    requirement: requirement:document-bundle-export
    selector: --format document
  json_only:
    requirement: requirement:json-codegen-export
    selector: --format json
  json_and_schema:
    requirement: requirement:json-codegen-export
    selector: --format json-schema
  sql:
    requirement: requirement:sql-ddl-export
    selector: --format sql
  all:
    selector: --format all
options:
  shared:
    - model and canvas selection
  diagram_and_document:
    - --name-mode business|system|physical
    - --card-content primary-keys|description
  sql:
    - --dialect mysql|postgresql|sqlite|duckdb|bigquery
    - repeated dialect flags select multiple targets
runtime:
  browser: forbidden
  webview: forbidden
  display_server: not_required
  frontend_dev_server: not_required
  network: not_required
architecture:
  - CLI and ui:export-dialog call decision:shared-go-export-engine.
  - Parsing data:project-document-set, normalization, validation, and rendering live in portable Go packages.
  - Command parsing and filesystem access remain thin adapters.
  - SVG and draw.io generation are deterministic headless operations.
diagnostics:
  human: stderr
  machine_readable: --diagnostics-json optional path
  source: data:export-diagnostic
exit_codes:
  success: 0
  validation_error: nonzero
  invalid_input: nonzero
  generation_or_write_failure: nonzero
constraints:
  - Input JSON is never modified.
  - Partial output is not reported as success.
  - Output files match UI export bytes for the same project snapshot and options.
  - Existing output is preserved unless overwrite is explicitly authorized.
acceptance:
  - A saved Wails project exports successfully on a machine where no browser is launched.
  - Every Export Dialog format is available from the CLI.
  - Validation diagnostics identify stable source ids and correction paths.
  - Identical input and options produce byte-identical output except declared timestamp metadata.
```
