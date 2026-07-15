package webhandler

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"time"

	"erdsketch/server/relay"
)

func (h *Handler) relayJoin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var request struct {
		ClientID string          `json:"clientId"`
		User     json.RawMessage `json:"user"`
	}
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil || request.ClientID == "" || len(request.User) == 0 {
		http.Error(w, "invalid relay join", http.StatusBadRequest)
		return
	}
	writeJSON(w, h.relay.Join(request.ClientID, request.User))
}

func (h *Handler) relayEvents(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	clientID := r.URL.Query().Get("clientId")
	stream, err := h.relay.Subscribe(clientID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "streaming unsupported", http.StatusInternalServerError)
		return
	}
	defer h.relay.Disconnect(clientID, stream)
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.WriteHeader(http.StatusOK)
	_, _ = fmt.Fprint(w, ": connected\n\n")
	flusher.Flush()
	keepAlive := time.NewTicker(20 * time.Second)
	defer keepAlive.Stop()
	for {
		select {
		case <-r.Context().Done():
			return
		case message := <-stream:
			data, marshalErr := json.Marshal(message)
			if marshalErr != nil {
				return
			}
			if _, err := fmt.Fprintf(w, "data: %s\n\n", data); err != nil {
				return
			}
			flusher.Flush()
		case <-keepAlive.C:
			if _, err := fmt.Fprint(w, ": keep-alive\n\n"); err != nil {
				return
			}
			flusher.Flush()
		}
	}
}

func (h *Handler) relayMessage(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var request struct {
		ClientID string        `json:"clientId"`
		Message  relay.Message `json:"message"`
	}
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil || request.ClientID == "" || request.Message.Kind == "" {
		http.Error(w, "invalid relay message", http.StatusBadRequest)
		return
	}
	if err := h.relay.Publish(request.ClientID, request.Message); err != nil {
		if errors.Is(err, relay.ErrUnknownClient) {
			http.Error(w, err.Error(), http.StatusUnauthorized)
			return
		}
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
