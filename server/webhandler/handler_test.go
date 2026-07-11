package webhandler

import (
	"bytes"
	"context"
	"io"
	"log"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"erdsketch/server/collaboration"
	"erdsketch/server/seed"
)

type seedListerStub struct {
	documents []seed.Document
}

func (s seedListerStub) List(context.Context) ([]seed.Document, error) {
	return s.documents, nil
}

func TestListSeeds(t *testing.T) {
	handler := newTestHandler(seedListerStub{documents: []seed.Document{{Name: "model/seeds/order.seed.yaml", Text: "name: Order\n"}}})
	request := httptest.NewRequest(http.MethodGet, "/api/seeds", nil)
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("status: got %d, want %d", response.Code, http.StatusOK)
	}
	if got := response.Body.String(); got != `[{"path":"model/seeds/order.seed.yaml","text":"name: Order\n"}]`+"\n" {
		t.Fatalf("body: got %q", got)
	}
}

func TestSeedUpdateRequiresOwningLock(t *testing.T) {
	hub := collaboration.NewHub()
	hub.Join(collaboration.Collaborator{ID: "lion", Name: "Lion"}, []collaboration.ModelSeed{{ID: "order", Title: "Order"}}, nil, nil)
	handler := New(hub, seedListerStub{}, log.New(io.Discard, "", 0))

	withoutLock := post(handler, "/api/collaboration/seed", `{"clientId":"lion","seed":{"id":"order","title":"Changed"}}`)
	if withoutLock.Code != http.StatusConflict {
		t.Fatalf("update without lock: got %d, want %d", withoutLock.Code, http.StatusConflict)
	}
	lockResponse := post(handler, "/api/collaboration/lock", `{"clientId":"lion","seedId":"order","action":"lock"}`)
	if lockResponse.Code != http.StatusOK {
		t.Fatalf("lock: got %d, want %d", lockResponse.Code, http.StatusOK)
	}
	withLock := post(handler, "/api/collaboration/seed", `{"clientId":"lion","seed":{"id":"order","title":"Changed"}}`)
	if withLock.Code != http.StatusNoContent {
		t.Fatalf("update with lock: got %d, want %d", withLock.Code, http.StatusNoContent)
	}
}

func TestEventsRequireClientID(t *testing.T) {
	handler := newTestHandler(seedListerStub{})
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/api/collaboration/events", nil))
	if response.Code != http.StatusBadRequest || !strings.Contains(response.Body.String(), "clientId is required") {
		t.Fatalf("response: status=%d body=%q", response.Code, response.Body.String())
	}
}

func newTestHandler(seeds SeedLister) http.Handler {
	return New(collaboration.NewHub(), seeds, log.New(io.Discard, "", 0))
}

func post(handler http.Handler, path, body string) *httptest.ResponseRecorder {
	response := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPost, path, bytes.NewBufferString(body))
	handler.ServeHTTP(response, request)
	return response
}
