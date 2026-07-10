package webhandler

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"erdsketch/server/collaboration"
)

func (h *Handler) join(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var request struct {
		User  collaboration.Collaborator `json:"user"`
		Seeds []collaboration.ModelSeed  `json:"seeds"`
	}
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil || request.User.ID == "" || request.User.Name == "" {
		http.Error(w, "invalid join request", http.StatusBadRequest)
		return
	}
	result := h.hub.Join(request.User, request.Seeds)
	if !result.AlreadyJoined {
		h.logger.Printf("[collab] join user=%q client=%s online=%d", request.User.Name, request.User.ID, result.Online)
	}
	writeJSON(w, result.State)
}

func (h *Handler) events(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	clientID := r.URL.Query().Get("clientId")
	if clientID == "" {
		http.Error(w, "clientId is required", http.StatusBadRequest)
		return
	}
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "streaming unsupported", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	subscription := h.hub.Subscribe(clientID)
	user := subscription.User()
	h.logger.Printf("[collab] stream connected user=%q client=%s", user.Name, clientID)
	defer func() {
		departure := subscription.Close()
		h.logger.Printf("[collab] leave user=%q client=%s released_locks=%d", departure.User.Name, clientID, departure.ReleasedLocks)
	}()

	if !writeEvent(w, subscription.Initial()) {
		return
	}
	flusher.Flush()
	keepAlive := time.NewTicker(20 * time.Second)
	defer keepAlive.Stop()

	for {
		select {
		case <-r.Context().Done():
			return
		case state := <-subscription.Updates():
			if !writeEvent(w, state) {
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

func (h *Handler) updateUser(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var request struct {
		ClientID string   `json:"clientId"`
		Name     *string  `json:"name"`
		X        *float64 `json:"x"`
		Y        *float64 `json:"y"`
	}
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil || request.ClientID == "" {
		http.Error(w, "invalid user update", http.StatusBadRequest)
		return
	}
	result, err := h.hub.UpdateUser(request.ClientID, request.Name, request.X, request.Y)
	if err != nil {
		writeCollaborationError(w, err)
		return
	}
	if result.Renamed {
		h.logger.Printf("[collab] rename user=%q previous=%q client=%s", result.User.Name, result.PreviousName, request.ClientID)
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) updateSeed(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var request struct {
		ClientID string                  `json:"clientId"`
		Seed     collaboration.ModelSeed `json:"seed"`
		Create   bool                    `json:"create"`
	}
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil || request.ClientID == "" || request.Seed.ID == "" {
		http.Error(w, "invalid seed update", http.StatusBadRequest)
		return
	}
	result, err := h.hub.UpdateSeed(request.ClientID, request.Seed, request.Create)
	if err != nil {
		writeCollaborationError(w, err)
		return
	}
	if result.Created {
		h.logger.Printf("[collab] create user=%q client=%s seed=%s title=%q position=(%.1f,%.1f)", result.User.Name, request.ClientID, result.Seed.ID, result.Seed.Title, result.Seed.X, result.Seed.Y)
	} else {
		h.logger.Printf("[collab] edit user=%q client=%s seed=%s fields=%s", result.User.Name, request.ClientID, result.Seed.ID, strings.Join(result.Changes, ","))
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) changeLock(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var request struct {
		ClientID string `json:"clientId"`
		SeedID   string `json:"seedId"`
		Action   string `json:"action"`
	}
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil || request.ClientID == "" || request.SeedID == "" {
		http.Error(w, "invalid lock request", http.StatusBadRequest)
		return
	}
	result, err := h.hub.ChangeLock(request.ClientID, request.SeedID, request.Action)
	if errors.Is(err, collaboration.ErrLockConflict) {
		h.logger.Printf("[collab] lock rejected user=%q client=%s seed=%s owner=%q owner_client=%s", result.User.Name, request.ClientID, request.SeedID, result.Owner.Name, result.Owner.ID)
		w.WriteHeader(http.StatusConflict)
		writeJSON(w, map[string]bool{"acquired": false})
		return
	}
	if err != nil {
		writeCollaborationError(w, err)
		return
	}
	if request.Action == "unlock" {
		if result.Unlocked {
			h.logger.Printf("[collab] unlock user=%q client=%s seed=%s", result.User.Name, request.ClientID, request.SeedID)
		}
		writeJSON(w, map[string]bool{"acquired": false})
		return
	}
	h.logger.Printf("[collab] lock user=%q client=%s seed=%s", result.User.Name, request.ClientID, request.SeedID)
	writeJSON(w, map[string]bool{"acquired": true})
}

func writeEvent(w http.ResponseWriter, state collaboration.State) bool {
	payload, err := json.Marshal(state)
	if err != nil {
		return false
	}
	_, err = fmt.Fprintf(w, "data: %s\n\n", payload)
	return err == nil
}

func writeCollaborationError(w http.ResponseWriter, err error) {
	status := http.StatusInternalServerError
	switch {
	case errors.Is(err, collaboration.ErrUnknownClient), errors.Is(err, collaboration.ErrSeedNotFound):
		status = http.StatusNotFound
	case errors.Is(err, collaboration.ErrSeedExists), errors.Is(err, collaboration.ErrLockRequired), errors.Is(err, collaboration.ErrLockConflict):
		status = http.StatusConflict
	}
	http.Error(w, err.Error(), status)
}
