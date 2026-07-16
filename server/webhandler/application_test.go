package webhandler

import (
	"io/fs"
	"net/http"
	"net/http/httptest"
	"testing"
	"testing/fstest"
)

func TestApplicationRoutesAPIAndFrontend(t *testing.T) {
	frontend := fstest.MapFS{
		"index.html":    {Data: []byte("workspace")},
		"assets/app.js": {Data: []byte("script")},
	}
	api := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusNoContent) })
	handler := NewApplication(api, frontend)

	for _, test := range []struct {
		path string
		want int
		body string
	}{
		{path: "/api/health", want: http.StatusNoContent},
		{path: "/assets/app.js", want: http.StatusOK, body: "script"},
		{path: "/workspace", want: http.StatusOK, body: "workspace"},
	} {
		response := httptest.NewRecorder()
		handler.ServeHTTP(response, httptest.NewRequest(http.MethodGet, test.path, nil))
		if response.Code != test.want || (test.body != "" && response.Body.String() != test.body) {
			t.Fatalf("%s: got status=%d body=%q", test.path, response.Code, response.Body.String())
		}
	}

	if _, err := fs.Stat(frontend, "index.html"); err != nil {
		t.Fatal(err)
	}
}
