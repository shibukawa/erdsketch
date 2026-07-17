---
id: decision:shared-go-export-engine
type: decision
title: Shared Go Export Engine
---

All validation and artifact generation are implemented once in portable Go and reused by native and browser targets.

```yaml
core:
  language: Go
  package_style: small public repository packages outside internal
  owns:
    - parsing data:project-document-set
    - normalization to data:codegen-exchange-model
    - data:export-diagnostic production
    - draw.io XML generation
    - SVG generation
    - Markdown document generation
    - JSON and JSON Schema generation
    - SQL DDL generation
  API:
    input: bytes plus explicit export options
    output: named artifact bytes plus diagnostics
    forbidden:
      - filesystem paths
      - browser handles
      - js.Value
      - HTTP request or response types
      - React or TypeScript state
targets:
  native:
    compiler: standard Go
    consumers:
      - requirement:headless-export-cli
      - requirement:wails-desktop-distribution
      - server-web adapters
  browser:
    compiler: TinyGo
    artifact: WebAssembly
    consumer: requirement:static-web-distribution
    codec_support: system:tinybind-go-jsonbind
adapters:
  CLI: arguments and native file I/O only
  Wails: generated bindings and native dialogs only
  browser: File, Blob, ZIP assembly, download, and WASM memory transfer only
source_views:
  semantic_exports:
    source: data:codegen-exchange-model
    applies_to:
      - JSON
      - JSON Schema
      - SQL DDL
      - Markdown inventories
  layout_exports:
    source: original immutable data:project-document-set snapshot
    applies_to:
      - draw.io XML
      - ERD SVG
      - DFD SVG
      - CRUD matrix SVG
    rule: layout fields are decoded by the portable engine but never copied into the code-generation exchange model
template_policy:
  current:
    text_template: unavailable in TinyGo support stack
    html_template: unavailable in TinyGo support stack
    generation: deterministic typed writers and escaping helpers
  future:
    adoption: only after TinyGo-compatible equivalents exist
    gate: byte-parity, escaping, security, and size tests
anti_duplication:
  - TypeScript may orchestrate and present options but never reimplement export semantics.
  - Native and WASM builds compile the same portable exporter source files.
  - Build-tag files contain platform adapters only, not format rules.
verification:
  - Native Go and TinyGo/WASM run the same golden input fixtures.
  - Both targets produce byte-identical artifacts for identical snapshots and options.
  - CI runs native tests, TinyGo tests, and the browser WASM build.
  - Static-web integration tests exercise exports with every backend request disabled.
```
