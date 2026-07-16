package webhandler

import (
	"bytes"
	"io/fs"
	"net/http"
	"path"
	"strings"
	"time"
)

func NewApplication(api http.Handler, frontend fs.FS) http.Handler {
	files := http.FileServer(http.FS(frontend))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/api/") {
			api.ServeHTTP(w, r)
			return
		}
		if r.Method != http.MethodGet && r.Method != http.MethodHead {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		name := strings.TrimPrefix(path.Clean(r.URL.Path), "/")
		if name == "." || name == "" {
			name = "index.html"
		}
		if _, err := fs.Stat(frontend, name); err != nil {
			name = "index.html"
		}
		if name == "index.html" {
			contents, err := fs.ReadFile(frontend, name)
			if err != nil {
				http.NotFound(w, r)
				return
			}
			http.ServeContent(w, r, name, time.Time{}, bytes.NewReader(contents))
			return
		}
		request := r.Clone(r.Context())
		url := *r.URL
		url.Path = "/" + name
		request.URL = &url
		files.ServeHTTP(w, request)
	})
}
