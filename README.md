# ERDSketch

[English](README.md) | [日本語](README.ja.md)

ERDSketch is a Design IDE for growing rough Concept Seeds into data flows, logical models, physical schemas, and plain-text design knowledge. It treats an ERD as one stage of a wider modeling process rather than the final product.

## Live demo

Try ERDSketch without installing anything:

**https://shibukawa.github.io/erdsketch/**

The static demo runs entirely in the browser. No account, API key, backend, or GPT-5.6 access is required. Project data remains local to the browser unless you explicitly export it or select a local folder.

## What you can do

- Start from complete Todo, Blog, and Help Desk sample projects or a blank project.
- Develop Concept Seeds into entities, fields, relationships, and multi-canvas ERDs.
- Describe business processes with DFDs and connect them to the data model.
- Maintain a shared vocabulary and reusable data domains.
- Review CRUD usage, model maturity, record counts, and storage estimates.
- Draw collaborative freehand annotations directly on a canvas.
- Collaborate peer-to-peer through manually signaled WebRTC sessions.
- Manage recoverable browser projects and import or export Git-friendly split YAML projects.
- Export design artifacts including SQL DDL, JSON, Draw.io, and document bundles.

## Quick start

### Requirements

- Node.js 24 LTS
- npm

Clone the repository and start the frontend development server:

```bash
git clone https://github.com/shibukawa/erdsketch.git
cd erdsketch
npm ci
npm run dev
```

Open **http://127.0.0.1:5173/**.

This frontend-only development mode does not require Go or TinyGo. When the Go relay API is unavailable, the browser automatically becomes a standalone local session host.

## Five-minute judge walkthrough

The live demo is the shortest testing path:

1. Open the [live demo](https://shibukawa.github.io/erdsketch/).
2. Choose the **Blog**, **Todo**, or **Help Desk** starter project.
3. Move from the Concept Seeds canvas to its ERD and DFD canvases.
4. Inspect entity fields, relationships, vocabulary bindings, data domains, CRUD information, and volume estimates.
5. Edit the model or add an annotation, then reload the page to see browser-local recovery.
6. Open **Projects** to create, save, load, import, or export a project.

The starter projects are built in, so no separate sample-data download is needed.

## Built with Codex and GPT-5.6

ERDSketch was built during OpenAI Build Week through an iterative, knowledge-driven Codex workflow. Several model configurations were explored, but most implementation work used **GPT-5.6 Sol with medium reasoning effort in Codex**.

Nearly all major product capabilities were implemented through Codex `/goal` runs, including:

- ERD modeling
- DFD modeling
- vocabulary and data-domain management
- WebRTC collaboration
- project management and recovery
- canvas annotations
- persistence, import, export, and distribution targets

GPT-5.6 is used as the primary implementation model in Codex; it is not currently required at application runtime. ERDSketch has an early-stage runtime AI assistant for Chrome built-in AI and user-configured local OpenAI-compatible servers, but that feature is separate from the GPT-5.6-assisted development process and is not required to run or judge the project.

### Knowledge-driven development loop

The development loop deliberately separates open-ended exploration from implementation context:

1. **Explore outside the repository.** I discuss the product and design extensively in ChatGPT. Keeping this divergent discussion outside the Codex project prevents abandoned ideas and conversational noise from entering implementation sessions.
2. **Distill the result.** At a coherent boundary, ChatGPT turns the useful conclusions into focused Markdown rather than passing a long conversation history to Codex.
3. **Compile project knowledge.** Codex uses the custom Knowledge Compiler skill to convert the distilled material into small, linked concepts under [`.knowledge/`](.knowledge/). The catalog currently contains 277 source concepts covering requirements, flows, rules, UI, data, systems, and architectural decisions.
4. **Refine with Codex.** I resolve detailed requirements and contradictions against that catalog before implementation.
5. **Implement a complete goal.** A `/goal` run gives GPT-5.6 Sol a cohesive implementation outcome instead of a sequence of disconnected code-generation prompts.
6. **Verify and feed back.** I test the result and request small UI corrections directly. If feedback changes internal design, it returns through Knowledge Compiler and the loop begins again at the specification layer.

This made `.knowledge` the durable contract between human product reasoning and Codex implementation. It also allowed later sessions to recover decisions without loading or trusting an entire chat transcript.

### Examples of key decisions

- [`concept:design-ide`](.knowledge/concept/design-ide.md) distinguishes a Design IDE from a conventional ERD editor and defines the product around model growth, knowledge, and decisions.
- [`flow:modeling-lifecycle`](.knowledge/flow/modeling-lifecycle.md) connects business knowledge, DFD-first exploration, vocabulary, logical modeling, normalization, storage design, and review.
- [`decision:frontend-session-authority`](.knowledge/decision/frontend-session-authority.md) places canonical collaboration state and conflict decisions in the first admitted browser rather than the relay server.
- [`decision:dedicated-persistence-worker`](.knowledge/decision/dedicated-persistence-worker.md) keeps recovery I/O, archive processing, and compression away from the UI thread.
- [`decision:manual-webrtc-signaling`](.knowledge/decision/manual-webrtc-signaling.md) enables peer-to-peer collaboration through manually exchanged URL fragments without adding a signaling service.
- [`decision:storage-adapter-selection`](.knowledge/decision/storage-adapter-selection.md) defines one persistence contract across static web, Go server, and Wails desktop modes.

The repository's commit history and the source concepts under `.knowledge` provide timestamped evidence of how these specifications and implementations evolved during the event.

## Tests

Run the standard frontend and Go test suites:

```bash
npm test
go test ./server/...
```

The frontend suite includes generic validation of every built-in starter project.

## Production and distribution

Production builds use Node.js 24 LTS and Go 1.26. The static build additionally requires TinyGo 0.41.1 because the export engine is compiled to WebAssembly.

```bash
npm run build:static   # dist/static; requires TinyGo, no Go API at runtime
npm run build:server   # server/webassets/dist; embedded by the Go binary
npm run build:desktop  # desktop/frontend/dist; embedded by Wails
```

The `Deploy static site to Pages` GitHub Actions workflow publishes the static target from `main`.

### Go backend

Run the Go collaboration and project-file backend separately from the Vite development server:

```bash
go run ./server/cmd/erdsketch
```

Vite proxies `/api` requests from port 5173 to `http://127.0.0.1:8080`. The server accepts `ERDSKETCH_ADDR`, `ERDSKETCH_MODEL_ROOT`, and `ERDSKETCH_PROJECT_ROOT` environment variables.

To build one production server executable with the frontend embedded:

```bash
npm run build:server
go build -tags production -o erdsketch ./server/cmd/erdsketch
```

### Container

```bash
docker build -t erdsketch .
docker run --rm -p 8080:8080 -v erdsketch-projects:/data/projects erdsketch
```

The container workflow builds amd64 and arm64 images and publishes them to GitHub Container Registry.

### Desktop

ERDSketch uses Wails v2 for native desktop builds:

```bash
go install github.com/wailsapp/wails/v2/cmd/wails@v2.13.0
cd desktop
wails build -tags desktop
```

The desktop workflow creates Linux amd64, Windows amd64, and macOS universal artifacts.

## Persistence and collaboration architecture

The first browser joining a runtime session is the session host. Canonical editing state, locks, operation ordering, and commit decisions live in that host's frontend memory. The Go runtime, when present, loads seed files, relays collaboration messages, and reads or writes project document sets; it does not become the editing authority.

Every accepted durable change is appended to the host browser's Origin Private File System (OPFS) before publication. Reloading restores the newest valid checkpoint and journal sequence. OPFS is origin-scoped recovery storage, not a user-visible folder or a substitute for backups.

- **Projects** manages named and temporary projects inside OPFS.
- With the Go backend, **Open** and **Save** use project directories under `model/projects/`.
- Without the backend, Chromium browsers can use a selected real folder through the File System Access API.
- Other browsers use OPFS for recovery and `.erdsketch.zip` archives for portable import and export.
- Stable timestamp-based paths and one YAML file per element keep Git conflicts localized.

```text
project.yaml
model/model-{timestamp}/
  model.yaml
  field-{timestamp}.yaml
erd/erd-{timestamp}/
  canvas.yaml
  model-{timestamp}.yaml
  annotation-{type}-{timestamp}.yaml
erd/relation-{timestamp}.yaml
dfd/dfd-{timestamp}/
  canvas.yaml
  process-{timestamp}.yaml
  model-{timestamp}.yaml
  extentity-{timestamp}.yaml
  datastore-{timestamp}.yaml
  dataflow-{timestamp}.yaml
  group-{timestamp}.yaml
domain/domain-{timestamp}.yaml
domain/category-{timestamp}.yaml
vocabulary/vocabulary-{timestamp}.yaml
```

## License

ERDSketch is released under the terms in [LICENSE](LICENSE).
