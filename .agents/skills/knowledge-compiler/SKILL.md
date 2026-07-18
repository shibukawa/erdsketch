---
name: knowledge-compiler
description: Create, maintain, compile, search, show, and export AI-first `.knowledge` catalogs with low source-token and context cost. Use when Codex needs to initialize or edit token-efficient English concepts, enforce OKF-compatible Markdown/frontmatter, compile or query `.knowledge` caches, generate review artifacts, or encode flows, DFDs, and UI sketches as YAML.
---

# Knowledge Compiler

## Goal

Maintain a correct, searchable `.knowledge` catalog while minimizing source size and model context. Keep source concepts small, machine-first, and written in token-efficient English. Use deterministic commands to expand, search, and export them.

Success means:

- changed concepts contain one primary idea and valid `id`, `type`, and `title` frontmatter;
- source facts are compact, non-duplicated, and connected through `type:name` references;
- compilation succeeds after source or schema changes;
- answers and exports load only the smallest relevant concept set;
- generated or localized prose never becomes `.knowledge` source accidentally.

## Workflow

1. Inspect `.knowledge/_schema/`, relevant source concepts, and cache state. Do not load the whole catalog when search can narrow it.
2. Run the smallest deterministic command that can resolve the task:
   ```bash
   python3 <skill-dir>/scripts/concept.py compile --project .
   python3 <skill-dir>/scripts/concept.py search --project . access
   python3 <skill-dir>/scripts/concept.py show --project . api:access-check --related --reverse
   python3 <skill-dir>/scripts/concept.py export --project . requirement:access-check --profile review
   ```
3. Read only the reference needed for the current work:
   - `references/authoring.md`: source style, granularity, relations, OKF alignment.
   - `references/cli.md`: commands, filters, and cache formats.
   - `references/yaml-structures.md`: flow, DFD, and UI sketch YAML.
   - `references/multi-agent.md`: bounded offloading, agent roles, and programmatic tool routing.
4. Edit source concepts under `.knowledge/`. Edit `_schema` only when catalog rules must change.
5. Compile and fix all reported source errors. Run the narrowest search or show command that verifies the requested result.
6. Stop when the requested concepts are valid, compiled, and verified. Report validation that could not be run.

For a new catalog, copy `assets/starter/.knowledge/` into the project root. The starter contains schemas, not sample concepts. Start a concept from `assets/templates/concept.md` and replace every placeholder.

## Source Contract

- Write `.knowledge` source in token-efficient English. Generate Japanese or other human-facing prose with `export`.
- Keep one primary idea per file at `.knowledge/<type>/<name>.md`.
- Allow only this frontmatter shape:
  ```yaml
  id: api:access-check
  type: api
  title: Access Check API
  ```
- Use lowercase `type`; format `id` as `type:name`; match the `id` prefix to `type`.
- Put stable `type:name` references in prose or YAML. Let compilation derive relations.
- Use compact YAML fences for structured fields, rules, states, flows, DFDs, and UI sketches.
- Omit Markdown tables, decorative prose, duplicated facts, relation lists, tags, status, role, category, format, and editor metadata from source concepts.
- Keep review documents and examples outside `.knowledge`. Never seed starter catalogs with sample concepts.
- Load types and metadata from `.knowledge/_schema/`; do not hard-code project-specific schema values.

## Decision Boundaries

For answer, explanation, review, or diagnosis requests, inspect and report without editing concepts. For create, update, fix, compile, or export requests, make the requested local changes and run non-destructive validation. Require confirmation before destructive work, external writes, or material scope expansion.

Use deterministic scripts before model reasoning. Delegate only bounded read-only or single-concept work. Keep cross-concept boundaries, contradiction resolution, schema design, multi-file semantic changes, and final approval with the main reasoning agent.

Do not add an extract command. Convert external artifacts into proposed concepts, preserve source evidence, and require user review before treating inferred concepts as authoritative.

## Runtime Policy

Use the bundled Python CLI as-is; it is self-contained through `vendor/python/`. Programmatic Tool Calling in GPT-5.6 uses JavaScript to orchestrate eligible API tools and does not make JavaScript inherently more token-efficient for bundled local scripts. Rewrite the CLI only when measured portability, startup, package-size, or maintenance gains justify the migration and parity tests cover every command.

Install optional repository agent support with:

```bash
python3 skills/knowledge-compiler/scripts/install_agent_support.py --project .
```
