# ERDSketch

ERDSketch is a Design IDE for growing data models from Concept Seeds into flows, logical models, physical schemas, and plain-text design knowledge.

## Frontend

```bash
npm install
npm run dev
```

The first screen is a Concept Seeds brainstorm canvas built with React, Tailwind CSS, and daisyUI.

## Backend

```bash
go run ./server/cmd/erdsketch
```

The Go runtime loads the plain-text seed files under `model/seeds/`, relays collaboration messages, and reads or writes project document sets. The first browser joining a runtime session is the session host; canonical editing state, locks, operation ordering, and commit decisions live in that host's frontend memory.

Every accepted durable change is appended to the host browser's Origin Private File System (OPFS) before it is published. Reloading the page restores the newest valid checkpoint and journal sequence. OPFS is scoped to the browser origin and is recovery storage, not a user-visible folder or a substitute for backups.

## Project files

- The `Projects` control manages named and temporary projects inside OPFS. Each project has an immutable internal ID, a user-visible name, and its own checkpoint and journal.
- `New project`, `Save current as`, `Load`, rename, and confirmed deletion are available to the session host. The last active project is restored after restart.
- With the Go backend, `Open` and `Save` use files under `model/projects/` through the backend.
- Without the backend, Chromium browsers can use a user-selected real folder through `showDirectoryPicker()`.
- Safari and browsers without the directory picker use OPFS for continuous recovery and compressed `txtar` archives for import/export.
- Exported archives use the `.erdsketch.txtar.gz` extension and are portable across the runtime modes.

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
