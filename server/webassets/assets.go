//go:build !production

package webassets

import "embed"

// Files contains a diagnostic page for development builds without frontend assets.
//
//go:embed all:fallback
var Files embed.FS
