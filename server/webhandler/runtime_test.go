package webhandler

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"net/http/httptest"
	"testing"

	"erdsketch/server/project"
	"erdsketch/server/relay"
)

type projectStoreStub struct{ documents project.DocumentSet }

func (s *projectStoreStub) Load(context.Context, string) (project.DocumentSet, error) {
	if s.documents.ProjectID == "" {
		return project.DocumentSet{}, project.ErrNotFound
	}
	return s.documents, nil
}

func (s *projectStoreStub) Save(_ context.Context, documents project.DocumentSet) error {
	s.documents = documents
	return nil
}

func TestRuntimeAssignsFirstRelayClientAsHost(t *testing.T) {
	handler := NewRuntime(relay.NewHub(), seedListerStub{}, &projectStoreStub{}, log.New(io.Discard, "", 0))
	host := runtimePost(handler, "/api/relay/join", `{"clientId":"host","user":{"id":"host","name":"Host"}}`)
	if host.Code != http.StatusOK {
		t.Fatalf("host join: %d %s", host.Code, host.Body.String())
	}
	var hostResult relay.JoinResult
	if err := json.Unmarshal(host.Body.Bytes(), &hostResult); err != nil || hostResult.Role != "host" {
		t.Fatalf("host result: %#v, %v", hostResult, err)
	}
	peer := runtimePost(handler, "/api/relay/join", `{"clientId":"peer","user":{"id":"peer","name":"Peer"}}`)
	var peerResult relay.JoinResult
	if err := json.Unmarshal(peer.Body.Bytes(), &peerResult); err != nil || peerResult.Role != "participant" || peerResult.HostID != "host" {
		t.Fatalf("peer result: %#v, %v", peerResult, err)
	}
}

func TestRuntimeProjectWritesRequireHost(t *testing.T) {
	store := &projectStoreStub{}
	handler := NewRuntime(relay.NewHub(), seedListerStub{}, store, log.New(io.Discard, "", 0))
	runtimePost(handler, "/api/relay/join", `{"clientId":"host","user":{"id":"host"}}`)
	runtimePost(handler, "/api/relay/join", `{"clientId":"peer","user":{"id":"peer"}}`)
	body := `{"formatVersion":2,"projectId":"demo","documents":{"project.yaml":"format_version: 2\nproject_id: demo\n"}}`
	peerRequest := httptest.NewRequest(http.MethodPut, "/api/project", bytes.NewBufferString(body))
	peerRequest.Header.Set("X-ERDSketch-Client-ID", "peer")
	peerResponse := httptest.NewRecorder()
	handler.ServeHTTP(peerResponse, peerRequest)
	if peerResponse.Code != http.StatusForbidden {
		t.Fatalf("peer write: got %d", peerResponse.Code)
	}
	hostRequest := httptest.NewRequest(http.MethodPut, "/api/project", bytes.NewBufferString(body))
	hostRequest.Header.Set("X-ERDSketch-Client-ID", "host")
	hostResponse := httptest.NewRecorder()
	handler.ServeHTTP(hostResponse, hostRequest)
	if hostResponse.Code != http.StatusNoContent || store.documents.ProjectID != "demo" {
		t.Fatalf("host write: status=%d store=%#v", hostResponse.Code, store.documents)
	}
}

func runtimePost(handler http.Handler, path, body string) *httptest.ResponseRecorder {
	response := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPost, path, bytes.NewBufferString(body))
	handler.ServeHTTP(response, request)
	return response
}
