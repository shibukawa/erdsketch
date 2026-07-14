package webhandler

import (
	"encoding/json"
	"net/http"

	"erdsketch/server/collaboration"
)

func (h *Handler) updateDFD(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var request struct {
		ClientID string                 `json:"clientId"`
		DFD      collaboration.DFDState `json:"dfd"`
	}
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil || request.ClientID == "" {
		http.Error(w, "invalid DFD update", http.StatusBadRequest)
		return
	}
	if err := h.hub.UpdateDFD(request.ClientID, request.DFD); err != nil {
		h.logger.Printf("[collab] DFD update rejected client=%s canvases=%d nodes=%d flows=%d groups=%d error=%v", request.ClientID, len(request.DFD.Canvases), len(request.DFD.Nodes), len(request.DFD.Flows), len(request.DFD.Groups), err)
		writeCollaborationError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) updateCatalogSeed(w http.ResponseWriter, r *http.Request) {
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
		http.Error(w, "invalid catalog seed update", http.StatusBadRequest)
		return
	}
	if _, err := h.hub.UpdateCatalogSeed(request.ClientID, request.Seed, request.Create); err != nil {
		writeCollaborationError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
