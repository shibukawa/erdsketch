# Package Layout and Boundary Decisions

Use this reference when deciding where backend code belongs or reviewing a proposed split.

## Target Shape

```text
server/
├── cmd/
│   └── erdsketch/
│       └── main.go
├── app/
│   ├── config.go
│   └── run.go
├── webhandler/
│   ├── handler.go
│   ├── collaboration.go
│   └── seed.go
├── collaboration/
│   ├── hub.go
│   └── types.go
├── seed/
│   ├── service.go
│   ├── store.go
│   └── types.go
├── fileio/
│   └── seed_store.go
└── browserfile/
    ├── seed_store_js_wasm.go
    └── seed_store_stub.go
```

Treat this as a responsibility map, not a requirement to create empty packages or reproduce every filename. Create only packages needed by the current change. Keep all of them outside `internal/`.

## Ownership Rules

### `cmd/erdsketch`

Own argument and environment parsing and process exit behavior. A typical entry point parses configuration, calls `app.Run`, logs an error, and exits. It must not know route patterns, storage paths, collaboration state, or JSON shapes.

### `app`

Own executable composition and lifetime. Select native versus browser adapters, construct services and handlers, configure the HTTP server, and coordinate shutdown. Keep business rules in their domain package rather than implementing them while wiring.

### `webhandler`

Own the HTTP boundary: route registration, methods, JSON DTOs, validation tied to requests, SSE framing and flushing, HTTP errors, and mapping domain errors to status codes. Inject capabilities with small interfaces. Do not read disk or own collaboration locking rules.

Prefer a constructor that returns `http.Handler`, allowing tests and callers to use the complete route tree without starting a listener.

### `collaboration`

Own thread-safe state and rules for joining, leaving, cursors, seed changes, locks, snapshots, and subscriptions. Expose operations expressed in Go values and errors. Keep SSE channels and network disconnect handling in `webhandler`; expose a subscription abstraction that can be closed when the request context ends.

Keep mutex ownership inside this package. Do not expose mutable maps or slices; copy snapshots at the boundary.

### `seed`

Own portable seed concepts and use cases. Define the storage interface here because this package consumes it. Prefer operation-shaped interfaces, for example:

```go
type Store interface {
	List(ctx context.Context) ([]Document, error)
	Read(ctx context.Context, name string) (Document, error)
	Write(ctx context.Context, document Document) error
}
```

Adjust methods to actual use cases; do not add speculative CRUD. Use logical names, content, and domain records rather than platform objects.

### `fileio`

Own native filesystem policy and implement `seed` ports with `os`, `io/fs`, and `path/filepath`. Keep the configured model root here or in `app.Config`; never rely on the process working directory deep inside a handler. Normalize and validate logical names before resolving paths, and prevent traversal outside the configured root.

### `browserfile`

Own JavaScript interop for user-mediated browser file reads and writes. Restrict `syscall/js` imports to `*_js_wasm.go` files with `//go:build js && wasm`. Put portable mapping and parsing elsewhere.

Browser selection and permission prompts require a user gesture and may be asynchronous. Model cancellation and rejected permissions as ordinary errors. Keep `js.Value`, `File`, `Blob`, and file handles inside the adapter. If JavaScript already reads a `File`, prefer crossing the boundary with its bytes, text, name, and metadata.

## Boundary Examples

Place code according to the dependency it inherently needs:

| Code | Owner |
| --- | --- |
| Parse `ERDSKETCH_ADDR` or flags | `cmd/erdsketch` |
| Assemble native storage and HTTP server | `app` |
| Register `/api/seeds` | `webhandler` |
| Encode a JSON error/status | `webhandler` |
| Decide whether a client owns a lock | `collaboration` |
| Represent a seed document | `seed` |
| Glob or enumerate native seed files | `fileio` |
| Invoke browser picker or read a `Blob` | `browserfile` |

Transport request/response structs may stay in `webhandler`. Stable concepts used by application logic belong to their domain package. Do not reuse transport DTOs merely to avoid a conversion.

## Testing Boundaries

- Test `webhandler` with fake interfaces and `httptest`; assert methods, status codes, JSON, SSE headers, and cancellation.
- Test `collaboration` directly, including concurrent access and subscription cleanup; use the race detector when changing synchronization.
- Test `seed` use cases with an in-memory fake declared in `_test.go`.
- Test `fileio` with `t.TempDir()` and explicit roots; cover ordering, missing files, invalid names, traversal, reads, and writes.
- Keep `cmd` tests limited to argument/config parsing when that logic is nontrivial.
- Compile WASM adapters with `GOOS=js GOARCH=wasm`; place browser integration behavior behind a small seam so portable parts can run in normal Go tests.

## Review Rejections

Reject or revise a design when:

- Adding an endpoint requires editing `main.go` beyond command configuration.
- A handler imports `os` or `path/filepath`.
- Collaboration rules accept `http.ResponseWriter` or `*http.Request`.
- A portable package imports `syscall/js`.
- An interface exposes native paths or `js.Value` to application logic.
- `app` becomes a second monolith instead of a composition root.
- A new package is named for vague reuse rather than a stable responsibility.
- Native and WASM implementations are mixed without build constraints.
