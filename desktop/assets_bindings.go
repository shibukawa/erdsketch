//go:build bindings

package main

import (
	"embed"
	"io/fs"
)

//go:embed all:fallback
var bindingAssets embed.FS

func desktopAssets() fs.FS {
	return bindingAssets
}
