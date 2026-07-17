---
id: system:tinybind-go-jsonbind
type: system
title: tinybind-go JSON Binding
---

tinybind-go/jsonbind supplies generated, reflection-free JSON codecs for portable Go and TinyGo/WASM without HTTP or SQL dependencies.

```yaml
module: github.com/shibukawa/tinybind-go
package: github.com/shibukawa/tinybind-go/jsonbind
source: https://github.com/shibukawa/tinybind-go
license: Apache-2.0
role:
  - provide TinyGo-compatible generated JSON encoders and decoders
  - avoid runtime field walking through reflection
  - isolate JSON codecs from HTTP and SQL runtime packages
  - keep generation in the host build, not the browser runtime
usage:
  target: decision:shared-go-export-engine browser WASM boundary and codecs
  generator: github.com/shibukawa/tinybind-go/cmd/tinybind-gen
  generated_code: committed or deterministically produced by go generate before TinyGo compilation
constraints:
  - Portable export packages import jsonbind, never the root HTTP runtime.
  - Pin and test the module version with the supported Go and TinyGo toolchains.
  - Native and TinyGo builds run parity tests for every used codec feature.
```
