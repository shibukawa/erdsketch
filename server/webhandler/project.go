package webhandler

import (
	"encoding/json"
	"errors"
	"net/http"

	"erdsketch/server/project"
	"erdsketch/server/relay"
)

func (h *Handler) projectFile(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		if err := h.relay.RequireHost(r.Header.Get("X-ERDSketch-Client-ID")); err != nil {
			http.Error(w, err.Error(), http.StatusForbidden)
			return
		}
		projectID := r.URL.Query().Get("projectId")
		documents, err := h.projects.Load(r.Context(), projectID)
		if errors.Is(err, project.ErrNotFound) {
			http.Error(w, err.Error(), http.StatusNotFound)
			return
		}
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		writeJSON(w, documents)
	case http.MethodPut:
		clientID := r.Header.Get("X-ERDSketch-Client-ID")
		if err := h.relay.RequireHost(clientID); err != nil {
			status := http.StatusForbidden
			if errors.Is(err, relay.ErrUnknownClient) {
				status = http.StatusUnauthorized
			}
			http.Error(w, err.Error(), status)
			return
		}
		var documents project.DocumentSet
		if err := json.NewDecoder(r.Body).Decode(&documents); err != nil {
			http.Error(w, "invalid project document set", http.StatusBadRequest)
			return
		}
		if err := h.projects.Save(r.Context(), documents); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}
