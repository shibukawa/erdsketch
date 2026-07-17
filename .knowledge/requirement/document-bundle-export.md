---
id: requirement:document-bundle-export
type: requirement
title: Document Bundle Export
---

Users export a complete human-readable project document set as one ZIP archive.

```yaml
container:
  format: ZIP
  manifest: required
document_format:
  media: Markdown
  extension: .md
  entrypoint: index.md
  applies_to: every human-readable inventory and model page
  navigation:
    shared_index_link: true
    cross_page_links: relative
    diagram_rendering: dedicated Markdown page with image reference
render_options:
  defaults:
    source: current ui:model-card-display-mode
    capture: when ui:export-dialog opens
  name_mode:
    independently_switchable: true
    values:
      - business_name
      - system_name
      - physical_name
  model_card_content:
    independently_switchable: true
    values:
      - primary_keys
      - description
contents:
  diagrams:
    dfd:
      source: every data:dfd-canvas
      format: SVG
      page: diagrams/dfd/*.md
      page_includes:
        - SVG image reference
        - used table links
        - processes and data flows
      layout_source:
        - original node coordinates
        - original groups
        - original flow endpoints
    erd:
      source: every ERD canvas from ui:erd-sketch-canvas
      format: SVG
      page: diagrams/erd/*.md
      page_includes:
        - SVG image reference
        - placed table links
        - relationships visible on the canvas
      layout_source:
        - original canvas membership
        - original model placements
        - original model rotation
    crud_matrix:
      source: requirement:crud-matrix-reporting
      format: SVG
      layout_source:
        - saved axis orientation
        - saved process ordering
        - saved model ordering
  inventories:
    project_index:
      path: index.md
      required: true
      includes:
        - links to every inventory, model, ERD, and DFD page
    tables:
      source: data:entity
      path: tables/*.md
      one_section_per_table: true
      include:
        - names
        - description as model note
        - role, dependency, privacy, maturity stage, and usage-scope tags
        - every data:attribute
        - primary and important flags
        - assigned data:data-domain
        - constraints and relationships
        - indexes and partitioning
        - volume estimates and average field sizes
        - additional SQL
      links:
        - index.md
        - related model pages
        - assigned domains
    vocabulary:
      source: every data:vocabulary-entry
      path: vocabulary.md
      required: true
    domains:
      source: every data:data-domain
      path: domains.md
      required: true
    relationships:
      source: every data:relationship
      path: relationships.md
      required: true
    dfd_processes_and_flows:
      source:
        - data:dfd-process
        - data:data-flow
      path: dfd-processes-and-flows.md
      required: true
    crud_assignments:
      source: data:crud-assignment
      path: crud-assignments.md
      required: true
manifest_fields:
  - export_format_version
  - project_id
  - generated_at
  - file_paths
  - source_snapshot_revision
constraints:
  - Paths are relative, stable, traversal-free, and collision-safe.
  - SVG files include complete diagram bounds and remain standalone when opened outside the archive.
  - Empty inventories are included with an explicit empty state.
  - All files come from the same immutable project snapshot.
  - Markdown inventories use normalized semantic data, while ERD and DFD SVG generation also reads the original layout in data:project-document-set.
  - Diagram layout is not added to data:codegen-exchange-model; it remains canonical editor source used only by layout-preserving exporters.
  - Markdown uses relative links to SVG files and related inventory documents.
  - Every Markdown page links back to index.md; relationship, CRUD, DFD model, and domain references link to their target pages or anchors.
  - index.md remains a compact table of contents and does not embed ERD or DFD SVG files.
  - Each ERD and DFD page embeds its SVG, links the standalone SVG, and links every used table page.
  - crud-assignments.md embeds the CRUD matrix SVG.
  - Initial name and model-card content choices match the current canvas card display settings.
  - Export presentation controls are independent and never mutate canvas settings.
  - Markdown and SVG generation does not require text/template or html/template.
  - Output escaping is implemented and tested in decision:shared-go-export-engine compatible with TinyGo.
acceptance:
  - One successful action downloads exactly one ZIP.
  - The manifest accounts for every generated file.
  - The archive contains all DFDs, ERDs, the CRUD matrix, table column lists, vocabulary, and domains.
  - Opening index.md provides direct navigation to every Markdown page.
  - Opening an ERD or DFD page renders that canvas SVG and lists the tables used by that canvas.
  - Model pages preserve notes, visible model tags, maturity, storage design, capacity metadata, and additional SQL when present.
```
