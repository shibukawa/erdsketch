//go:build desktop && !bindings

package main

import (
	"embed"
	"io/fs"
)

//go:embed all:frontend/dist
var productionAssets embed.FS

func desktopAssets() fs.FS {
	return productionAssets
}
