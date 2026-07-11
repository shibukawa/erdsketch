package webhandler

import (
	"context"
	"encoding/json"
	"log"
	"net/http"

	"erdsketch/server/collaboration"
	"erdsketch/server/seed"
)

type SeedLister interface {
	List(context.Context) ([]seed.Document, error)
}

type Handler struct {
	hub    *collaboration.Hub
	seeds  SeedLister
	logger *log.Logger
}

func New(hub *collaboration.Hub, seeds SeedLister, logger *log.Logger) http.Handler {
	if logger == nil {
		logger = log.Default()
	}
	handler := &Handler{hub: hub, seeds: seeds, logger: logger}
	mux := http.NewServeMux()
	mux.HandleFunc("/api/health", handler.health)
	mux.HandleFunc("/api/seeds", handler.listSeeds)
	mux.HandleFunc("/api/collaboration/join", handler.join)
	mux.HandleFunc("/api/collaboration/events", handler.events)
	mux.HandleFunc("/api/collaboration/user", handler.updateUser)
	mux.HandleFunc("/api/collaboration/seed", handler.updateSeed)
	mux.HandleFunc("/api/collaboration/relationship", handler.updateRelationship)
	mux.HandleFunc("/api/collaboration/domain", handler.updateDomain)
	mux.HandleFunc("/api/collaboration/domain-category", handler.updateDomainCategory)
	mux.HandleFunc("/api/collaboration/lock", handler.changeLock)
	return mux
}

func (h *Handler) health(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	_, _ = w.Write([]byte(`{"ok":true}`))
}

func (h *Handler) listSeeds(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	documents, err := h.seeds.List(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	response := make([]seedFileResponse, 0, len(documents))
	for _, document := range documents {
		response = append(response, seedFileResponse{Path: document.Name, Text: document.Text})
	}
	writeJSON(w, response)
}

type seedFileResponse struct {
	Path string `json:"path"`
	Text string `json:"text"`
}

func writeJSON(w http.ResponseWriter, value any) {
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(value); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}
