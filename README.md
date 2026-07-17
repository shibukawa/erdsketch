# ERDSketch

ERDSketch is a Design IDE for growing data models from Concept Seeds into flows, logical models, physical schemas, and plain-text design knowledge.

## Frontend

```bash
npm install
npm run dev
```

Production build targets are explicit:

```bash
npm run build:static   # dist/static, no Go API dependency
npm run build:server   # server/webassets/dist, embedded by the Go binary
npm run build:desktop  # desktop/frontend/dist, embedded by Wails
```

The `Deploy static site to Pages` GitHub Actions workflow publishes the static target from `main` and can also be run manually.

The first screen is a Concept Seeds brainstorm canvas built with React, Tailwind CSS, and daisyUI.

## Backend

```bash
go run ./server/cmd/erdsketch
```

Build the production frontend before compiling the server so it is embedded in the executable:

```bash
npm run build:server
go build -tags production -o erdsketch ./server/cmd/erdsketch
```

The server accepts `ERDSKETCH_ADDR`, `ERDSKETCH_MODEL_ROOT`, and `ERDSKETCH_PROJECT_ROOT` environment variables.

## Desktop

ERDSketch uses Wails v2 for native desktop builds:

```bash
go install github.com/wailsapp/wails/v2/cmd/wails@v2.13.0
cd desktop
wails build -tags desktop
```

The `Build desktop applications` workflow creates Linux amd64, Windows amd64, and macOS universal artifacts.

## Container

```bash
docker build -t erdsketch .
docker run --rm -p 8080:8080 -v erdsketch-projects:/data/projects erdsketch
```

The container workflow builds amd64 and arm64 images and pushes branch, tag, commit, and `latest` tags to GitHub Container Registry outside pull requests.

The Go runtime loads the plain-text seed files under `model/seeds/`, relays collaboration messages, and reads or writes project document sets. The first browser joining a runtime session is the session host; canonical editing state, locks, operation ordering, and commit decisions live in that host's frontend memory.

Every accepted durable change is appended to the host browser's Origin Private File System (OPFS) before it is published. Reloading the page restores the newest valid checkpoint and journal sequence. OPFS is scoped to the browser origin and is recovery storage, not a user-visible folder or a substitute for backups.

## Project files

- The `Projects` control manages named and temporary projects inside OPFS. Each project has an immutable internal ID, a user-visible name, and its own checkpoint and journal.
- `New project`, `Save current as`, `Load`, rename, and confirmed deletion are available to the session host. The last active project is restored after restart.
- With the Go backend, `Open` and `Save` use one directory per project under `model/projects/` through the backend.
- Without the backend, Chromium browsers can use a user-selected real folder through `showDirectoryPicker()`.
- Safari and browsers without the directory picker use OPFS for continuous recovery and ZIP archives for import/export.
- Exported archives use the `.erdsketch.zip` extension and contain the same split YAML tree as a local project folder.
- Every persisted element receives a fixed-width Base36 timestamp from the collaboration host. Stable timestamp-based paths and one YAML file per element keep Git conflicts localized.

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

Run frontend-only mode with `npm run dev`. If the `/api/relay/join` endpoint is unavailable, the browser becomes a standalone local host automatically.

## Plain-Text Model

Model files are intended to stay small and Git-friendly.

```text
model/
  seeds/
    order.seed.yaml
    order-reception.seed.yaml
    price-at-order.seed.yaml
```
