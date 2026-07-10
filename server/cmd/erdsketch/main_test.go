package main

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"testing"
)

func request(t *testing.T, handler http.HandlerFunc, body string) *httptest.ResponseRecorder {
	t.Helper()
	recorder := httptest.NewRecorder()
	handler(recorder, httptest.NewRequest(http.MethodPost, "/", bytes.NewBufferString(body)))
	return recorder
}

func TestSeedUpdateRequiresOwningLock(t *testing.T) {
	hub := NewHub()
	hub.users["lion"] = Collaborator{ID: "lion", Name: "Lion"}
	hub.seeds = []ModelSeed{{ID: "order", Title: "Order"}}

	withoutLock := request(t, hub.updateSeed, `{"clientId":"lion","seed":{"id":"order","title":"Changed"}}`)
	if withoutLock.Code != http.StatusConflict {
		t.Fatalf("update without lock: got %d, want %d", withoutLock.Code, http.StatusConflict)
	}

	lockResponse := request(t, hub.lockSeed, `{"clientId":"lion","seedId":"order","action":"lock"}`)
	if lockResponse.Code != http.StatusOK {
		t.Fatalf("lock: got %d, want %d", lockResponse.Code, http.StatusOK)
	}

	withLock := request(t, hub.updateSeed, `{"clientId":"lion","seed":{"id":"order","title":"Changed"}}`)
	if withLock.Code != http.StatusNoContent {
		t.Fatalf("update with lock: got %d, want %d", withLock.Code, http.StatusNoContent)
	}
	if hub.seeds[0].Title != "Changed" {
		t.Fatalf("title: got %q, want Changed", hub.seeds[0].Title)
	}
}

func TestLockRejectsAnotherCollaborator(t *testing.T) {
	hub := NewHub()
	hub.users["lion"] = Collaborator{ID: "lion", Name: "Lion"}
	hub.users["koara"] = Collaborator{ID: "koara", Name: "Koara"}

	first := request(t, hub.lockSeed, `{"clientId":"lion","seedId":"order","action":"lock"}`)
	second := request(t, hub.lockSeed, `{"clientId":"koara","seedId":"order","action":"lock"}`)
	if first.Code != http.StatusOK || second.Code != http.StatusConflict {
		t.Fatalf("lock responses: first=%d second=%d", first.Code, second.Code)
	}
	if hub.locks["order"] != "lion" {
		t.Fatalf("lock owner: got %q, want lion", hub.locks["order"])
	}
}
