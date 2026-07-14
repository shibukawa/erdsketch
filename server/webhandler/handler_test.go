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

func TestNamingPolicyEndpointUpdatesProjectPolicy(t *testing.T) {
	hub := collaboration.NewHub()
	hub.Join(collaboration.Collaborator{ID: "lion", Name: "Lion"}, nil, nil, nil)
	handler := New(hub, seedListerStub{}, log.New(io.Discard, "", 0))

	response := post(handler, "/api/collaboration/naming-policy", `{"clientId":"lion","policy":{"tablePluralization":"plural"}}`)
	if response.Code != http.StatusNoContent {
		t.Fatalf("update naming policy: got %d, want %d; body=%q", response.Code, http.StatusNoContent, response.Body.String())
	}
	invalid := post(handler, "/api/collaboration/naming-policy", `{"clientId":"lion","policy":{"tablePluralization":"sometimes"}}`)
	if invalid.Code != http.StatusBadRequest {
		t.Fatalf("invalid naming policy: got %d, want %d", invalid.Code, http.StatusBadRequest)
	}
}

func TestVocabularyEndpointCreatesAndRejectsDuplicateTerms(t *testing.T) {
	hub := collaboration.NewHub()
	hub.Join(collaboration.Collaborator{ID: "lion", Name: "Lion"}, nil, nil, nil)
	handler := New(hub, seedListerStub{}, log.New(io.Discard, "", 0))
	created := post(handler, "/api/collaboration/vocabulary", `{"clientId":"lion","create":true,"entry":{"id":"order","businessName":"Order","systemName":"Order","physicalName":"order","meaning":"","memo":"","aliases":[]}}`)
	if created.Code != http.StatusNoContent {
		t.Fatalf("create vocabulary: got %d body=%q", created.Code, created.Body.String())
	}
	duplicate := post(handler, "/api/collaboration/vocabulary", `{"clientId":"lion","create":true,"entry":{"id":"order-2","businessName":"order","systemName":"","physicalName":"","meaning":"","memo":"","aliases":[]}}`)
	if duplicate.Code != http.StatusConflict {
		t.Fatalf("duplicate vocabulary: got %d, want %d", duplicate.Code, http.StatusConflict)
	}
	aliasConflict := post(handler, "/api/collaboration/vocabulary", `{"clientId":"lion","create":true,"entry":{"id":"purchase","businessName":"Purchase","systemName":"","physicalName":"","meaning":"","memo":"","aliases":["ORDER"]}}`)
	if aliasConflict.Code != http.StatusConflict {
		t.Fatalf("alias conflict: got %d, want %d", aliasConflict.Code, http.StatusConflict)
	}
}

func TestCanvasPlacementAndOwnershipEndpoints(t *testing.T) {
	hub := collaboration.NewHub()
	hub.Join(collaboration.Collaborator{ID: "lion", Name: "Lion"}, []collaboration.ModelSeed{{ID: "order", Title: "Order"}}, nil, nil)
	handler := New(hub, seedListerStub{}, log.New(io.Discard, "", 0))
	created := post(handler, "/api/collaboration/canvas", `{"clientId":"lion","create":true,"canvas":{"id":"billing","name":"Billing"}}`)
	if created.Code != http.StatusNoContent {
		t.Fatalf("create canvas: status=%d body=%q", created.Code, created.Body.String())
	}
	placed := post(handler, "/api/collaboration/placement", `{"clientId":"lion","create":true,"placement":{"canvasId":"billing","seedId":"order","x":20,"y":30,"accessMode":"owner"}}`)
	if placed.Code != http.StatusNoContent {
		t.Fatalf("place model: status=%d body=%q", placed.Code, placed.Body.String())
	}
	transferred := post(handler, "/api/collaboration/ownership", `{"clientId":"lion","seedId":"order","expectedOwnerId":"main","targetCanvasId":"billing"}`)
	if transferred.Code != http.StatusNoContent {
		t.Fatalf("transfer ownership: status=%d body=%q", transferred.Code, transferred.Body.String())
	}
	stale := post(handler, "/api/collaboration/ownership", `{"clientId":"lion","seedId":"order","expectedOwnerId":"main","targetCanvasId":"billing"}`)
	if stale.Code != http.StatusConflict {
		t.Fatalf("stale transfer: got %d, want conflict", stale.Code)
	}
}

func TestDFDAndCatalogSeedEndpoints(t *testing.T) {
	hub := collaboration.NewHub()
	hub.Join(collaboration.Collaborator{ID: "lion", Name: "Lion"}, nil, nil, nil)
	handler := New(hub, seedListerStub{}, log.New(io.Discard, "", 0))
	created := post(handler, "/api/collaboration/catalog-seed", `{"clientId":"lion","create":true,"seed":{"id":"payload","title":"Payload","role":"work","dependency":"independent","usageScope":"dfd_only"}}`)
	if created.Code != http.StatusNoContent {
		t.Fatalf("catalog seed: status=%d body=%q", created.Code, created.Body.String())
	}
	dfd := post(handler, "/api/collaboration/dfd", `{"clientId":"lion","dfd":{"canvases":[{"id":"flow","name":"Flow"}],"nodes":[{"id":"payload-node","definitionId":"payload","canvasId":"flow","kind":"model","modelId":"payload","x":20,"y":30}],"flows":[],"groups":[]}}`)
	if dfd.Code != http.StatusNoContent {
		t.Fatalf("DFD update: status=%d body=%q", dfd.Code, dfd.Body.String())
	}
	legacyPhysical := post(handler, "/api/collaboration/dfd", `{"clientId":"lion","dfd":{"canvases":[{"id":"flow","name":"Flow"}],"nodes":[{"id":"checkout","definitionId":"checkout","canvasId":"flow","kind":"process","name":"Checkout","processKind":"ui","physicalProcesses":["Screen","Submit"]}],"flows":[],"groups":[]}}`)
	if legacyPhysical.Code != http.StatusNoContent {
		t.Fatalf("legacy physical processes: status=%d body=%q", legacyPhysical.Code, legacyPhysical.Body.String())
	}
	invalid := post(handler, "/api/collaboration/dfd", `{"clientId":"lion","dfd":{"canvases":[],"nodes":[],"flows":[],"groups":[]}}`)
	if invalid.Code != http.StatusBadRequest {
		t.Fatalf("invalid DFD: got %d, want %d", invalid.Code, http.StatusBadRequest)
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
