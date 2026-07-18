# Multi-Agent Offloading

## Principle

Keep expensive reasoning focused on high-level judgment. Use deterministic scripts first, then lightweight agents for narrow read-only or single-file work.

Order of preference:

1. deterministic scripts,
2. lightweight model or subagent,
3. main reasoning model.

## GPT-5.6 Programmatic Tool Calling

Use Programmatic Tool Calling only for a bounded reduction stage that batches similar read-only calls and returns a much smaller structured result. Define eligible tools, output fields, evidence, retry limit, and stop condition. Return to direct model judgment for concept boundaries, contradictions, approvals, citations, and final validation.

Do not use it merely because calls are parallel or dependent. Do not rewrite bundled Python scripts in JavaScript to obtain Programmatic Tool Calling: its JavaScript runtime orchestrates eligible Responses API tools and is separate from the skill's local CLI. Consider a CLI migration only after measuring portability, startup, package size, and maintenance cost, with behavior-parity tests for every command.

## Good Offload Targets

- Search `.knowledge` without editing.
- Read one concept and summarize it.
- Check one concept against authoring rules.
- Edit one concept file.
- Draft one small concept.
- Convert one user note into one `.knowledge` concept.
- Check broken `type:id` references.
- Generate review Markdown from compiled cache.
- Compare two concept files.
- Propose missing references.
- Rewrite Japanese discussion into token-efficient English `.knowledge`.

## Do Not Offload

- Global architecture decisions.
- Concept boundary decisions across many files.
- Contradiction resolution.
- Multi-file semantic changes.
- Accepting or rejecting generated concepts.
- Schema/type design.
- Final review before commit.

## Suggested Agent Roles

`concept-searcher`: read-only, lightweight. Search compiled cache, inspect related IDs, list candidate concepts.

`concept-editor`: single-file edit, lightweight. Edit exactly one concept, preserve machine-first style, avoid Markdown tables, keep token-efficient English.

`concept-reviewer`: read-only, lightweight or medium. Check authoring rules, oversized concepts, broken or missing `type:id` references.

`concept-architect`: strong model or main agent. Split concepts, resolve ambiguity, design schema changes, approve multi-file changes.

## Repository Support Files

Install optional support files from `assets/repository-support/`:

```bash
python3 skills/knowledge-compiler/scripts/install_agent_support.py --project .
```

The support files include:

- `.claude/agents/concept-searcher.md`
- `.claude/agents/concept-editor.md`
- `.claude/agents/concept-reviewer.md`
- `.github/copilot-instructions.md`
- `.github/agents/concept-reviewer.md`
- `.agents/knowledge-compiler/delegation.md`
- `.agents/knowledge-compiler/prompts/*.md`

Treat these as project-local templates. Adjust model names and tool restrictions to the target agent runtime.
