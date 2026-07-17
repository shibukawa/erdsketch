#!/bin/sh

set -eu

project_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
output_dir="$project_root/public"
tinygo_root=$(tinygo env TINYGOROOT)

cd "$project_root"
mkdir -p "$output_dir"
tinygo build -target wasm -o "$output_dir/erdsketch-export.wasm" ./server/cmd/erdsketch-export-wasm
cp "$tinygo_root/targets/wasm_exec.js" "$output_dir/wasm_exec.js"
