# Knowledge Compiler

Knowledge Compiler is a Codex skill for maintaining AI-first `.knowledge` catalogs. It treats specifications as small, machine-first concepts instead of long human-first documents.

## Philosophy

`.knowledge` source is optimized for agents:

- Use token-efficient English as the source language.
- Keep one semantic concept per file.
- Keep frontmatter tiny: `id`, `type`, and `title`.
- Put structured facts in YAML fences.
- Infer relations from `type:name` references in the body.
- Keep human-readable review documents as generated exports, not source of truth.

The source corpus should stay compact and stable. Generated cache files under `.knowledge/.cache/` may be verbose because they are for deterministic tools, not direct agent reading.

## Project Layout

Typical project layout:

```text
.knowledge/
  _schema/
    types.yaml
    categories.yaml
    enums.yaml
  <type>/
    <name>.md
  .cache/
    concepts.jsonl
    relations.jsonl
    index.jsonl
```

The starter at `assets/starter/.knowledge/` contains schema files only. It intentionally contains no sample concepts, so new projects do not get unrelated search results.

Use `assets/templates/concept.md` when drafting a new concept.

## Basic Usage

Compile a catalog:

```bash
python3 skills/knowledge-compiler/scripts/concept.py compile --project .
```

Search compiled concepts:

```bash
python3 skills/knowledge-compiler/scripts/concept.py search --project . access
python3 skills/knowledge-compiler/scripts/concept.py search --project . --type api access
```

Show one concept and nearby useful context:

```bash
python3 skills/knowledge-compiler/scripts/concept.py show --project . api:access-check --related --reverse
```

Export human-facing review Markdown:

```bash
python3 skills/knowledge-compiler/scripts/concept.py export --project . requirement:access-check --profile review --output review.md
```

## Authoring Rules

Concept frontmatter:

```yaml
---
id: api:access-check
type: api
title: Access Check API
---
```

Rules:

- `id` must use `type:name`.
- `type` must be lowercase.
- `id` prefix and `type` must match.
- Do not put `role`, `category`, `format`, `editor`, tags, status, or relations in frontmatter.
- Resolve role and category from `.knowledge/_schema/`.
- Write references as `type:name` in prose or YAML.
- Do not use Markdown tables in `.knowledge` source.

## Multi-Agent Support

Install optional repository support files:

```bash
python3 skills/knowledge-compiler/scripts/install_agent_support.py --project .
```

This installs templates for:

- Claude Code custom agents,
- GitHub Copilot instructions and reviewer agent,
- generic `.agents/knowledge-compiler/` delegation prompts.

The offloading strategy is:

1. deterministic Python scripts,
2. lightweight read-only or single-file agents,
3. main reasoning model for schema design, cross-concept judgment, and final approval.

## License

Knowledge Compiler original skill content is licensed under **AGPL-3.0-or-later**.

Vendored third-party libraries remain under their own licenses. Full license and attribution files are stored in `vendor/licenses/`.

## Bundled Python Dependencies

| Product | Version | Author / copyright holder | License |
| --- | --- | --- | --- |
| `fastjsonschema` | 2.21.2 | Michal Horejsek | BSD-3-Clause |
| `pyyaml-pure` | 0.1.0 | Ali Fadel / MilkStraw AI | MIT |

Complete license and attribution notices are preserved in `vendor/licenses/`.
