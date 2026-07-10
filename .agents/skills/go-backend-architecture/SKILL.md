---
name: go-backend-architecture
description: Structure and review erdsketch's Go backend as small public repository packages with a thin cmd/erdsketch main, separated HTTP handlers, collaboration logic, and file I/O ports and adapters. Use for any Go backend creation, edit, refactor, review, test, native file access, HTTP/SSE endpoint, WebAssembly build, browser File API integration, or package-boundary change in this repository.
---

# Go Backend Architecture

Apply these rules to every Go backend change in this repository. Keep business logic portable across the native server and a future browser WebAssembly target.

## Inspect Before Editing

1. Read `go.mod`, `server/cmd/erdsketch`, nearby Go tests, and all packages affected by the change.
2. Search call sites before moving exported identifiers or changing package APIs.
3. Identify each changed responsibility as one of: command entry point, composition, HTTP transport, application/domain logic, storage contract, native adapter, or browser adapter.
4. Read [references/package-layout.md](references/package-layout.md) whenever adding, moving, or reviewing packages, file access, HTTP handlers, or WASM code.

## Keep the Command Thin

Keep `server/cmd/erdsketch/main.go` limited to process concerns:

- Parse command-line arguments, flags, and environment-derived defaults.
- Construct a configuration value and hand it to the application entry point.
- Convert the returned error into logging and an exit status.

Do not define HTTP handlers, routes, domain models, collaboration state, file traversal, serialization logic, or reusable helpers in package `main`. Do not test application behavior through unexported `main` functions; test the owning package instead.

## Split by Responsibility

Use cohesive packages, not layer names that accumulate unrelated code:

- `server/app`: composition root and process lifecycle; wire concrete adapters to ports.
- `server/webhandler`: HTTP/SSE request decoding, response encoding, status codes, headers, routing, and transport-specific concerns.
- `server/collaboration`: concurrency-safe collaboration rules, users, locks, snapshots, and broadcasts without `http.ResponseWriter` or `*http.Request`.
- `server/seed`: seed application operations and portable seed types; declare storage interfaces at the package that consumes them.
- `server/fileio`: native filesystem implementation of storage ports, path policy, and file encoding/decoding.
- `server/browserfile`: browser File API adapter only when WASM integration is introduced.

Do not create `internal/`. Do not create generic dumping grounds such as `utils`, `common`, `helpers`, `models`, or `services`. Add a package only when its responsibility and dependency direction can be named clearly.

## Preserve Portability

Keep application/domain packages free of `net/http`, `os`, `io/fs`, `path/filepath`, and `syscall/js` unless that package is the corresponding adapter.

Define narrow storage ports around application operations, using values such as bytes, text, logical names, or domain records. Do not leak filesystem paths, `fs.File`, JavaScript values, or browser handles through portable APIs.

Keep native and browser I/O behind separate adapters. Isolate `syscall/js` in files suffixed `_js_wasm.go` with appropriate build constraints. Provide non-WASM implementations or stubs where needed so ordinary `go test ./...` remains buildable.

Treat browser file access as user-mediated asynchronous I/O. Do not model it as unrestricted `os.ReadFile` or directory globbing. Let JavaScript obtain user-selected files or handles through the File API/File System Access API, then pass content or an adapter call across the WASM boundary.

## Control Dependencies

Point dependencies inward:

```text
cmd/erdsketch -> app -> webhandler
                     -> collaboration
                     -> seed <- fileio
                             <- browserfile
```

Let `app` wire packages. Let `webhandler` depend on narrow collaboration and seed interfaces. Never let domain/application packages import `webhandler`, `fileio`, `browserfile`, or package `main`. Avoid import cycles by moving a contract to its consumer, not to a generic shared package.

## Refactor Safely

1. Characterize current behavior with focused tests before moving intertwined logic.
2. Extract portable types and logic first.
3. Extract storage ports and native adapters.
4. Extract HTTP handlers and route construction.
5. Reduce `main` to argument/configuration handling and one application call.
6. Keep wire formats, routes, status codes, SSE behavior, locking semantics, default address, and model paths stable unless the request changes them.
7. Prefer small compiling moves over a repository-wide rewrite.

## Verify

Run formatting and tests appropriate to the change:

```bash
gofmt -w <changed-go-files>
go test ./...
go vet ./...
```

When WASM-specific files change, also compile the relevant package or command with `GOOS=js GOARCH=wasm`. Test handlers with `httptest`, collaboration rules without HTTP, storage contracts with fakes, and native file behavior with `t.TempDir()`.

Before finishing, verify that package `main` contains only process-boundary handling, HTTP code contains no storage implementation, portable logic imports no platform adapter, and both native tests and the applicable WASM compile check pass.
