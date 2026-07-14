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
		User                   collaboration.Collaborator            `json:"user"`
		Seeds                  []collaboration.ModelSeed             `json:"seeds"`
		Relationships          []collaboration.Relationship          `json:"relationships"`
		RelationshipReferences []collaboration.RelationshipReference `json:"relationshipReferences"`
		Domains                []collaboration.DataDomain            `json:"domains"`
		AssignAvailableName    bool                                  `json:"assignAvailableName"`
	}
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil || request.User.ID == "" || (!request.AssignAvailableName && request.User.Name == "") {
		http.Error(w, "invalid join request", http.StatusBadRequest)
		return
	}
	result := h.hub.JoinWithNameAssignment(request.User, request.AssignAvailableName, request.Seeds, request.Relationships, request.RelationshipReferences, request.Domains)
	if !result.AlreadyJoined {
		h.logger.Printf("[collab] join user=%q client=%s online=%d", result.User.Name, request.User.ID, result.Online)
	}
	writeJSON(w, result.State)
}

func (h *Handler) updateDomain(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var request struct {
		ClientID string                   `json:"clientId"`
		Domain   collaboration.DataDomain `json:"domain"`
		Create   bool                     `json:"create"`
		Delete   bool                     `json:"delete"`
	}
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil || request.ClientID == "" || request.Domain.ID == "" {
		http.Error(w, "invalid domain update", http.StatusBadRequest)
		return
	}
	result, err := h.hub.UpdateDomain(request.ClientID, request.Domain, request.Create, request.Delete)
	if err != nil {
		writeCollaborationError(w, err)
		return
	}
	if result.Deleted {
		h.logger.Printf("[collab] delete domain user=%q client=%s domain=%s", result.User.Name, request.ClientID, result.Domain.ID)
	} else if result.Created {
		h.logger.Printf("[collab] create domain user=%q client=%s domain=%s", result.User.Name, request.ClientID, result.Domain.ID)
	} else {
		h.logger.Printf("[collab] edit domain user=%q client=%s domain=%s", result.User.Name, request.ClientID, result.Domain.ID)
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) updateDomainCategory(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var request struct {
		ClientID string                       `json:"clientId"`
		Category collaboration.DomainCategory `json:"category"`
		Create   bool                         `json:"create"`
	}
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil || request.ClientID == "" || request.Category.ID == "" {
		http.Error(w, "invalid domain category update", http.StatusBadRequest)
		return
	}
	result, err := h.hub.UpdateCategory(request.ClientID, request.Category, request.Create)
	if err != nil {
		writeCollaborationError(w, err)
		return
	}
	if result.Created {
		h.logger.Printf("[collab] create domain category user=%q client=%s category=%s", result.User.Name, request.ClientID, result.Category.ID)
	} else {
		h.logger.Printf("[collab] edit domain category user=%q client=%s category=%s", result.User.Name, request.ClientID, result.Category.ID)
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) updateNamingPolicy(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var request struct {
		ClientID string                     `json:"clientId"`
		Policy   collaboration.NamingPolicy `json:"policy"`
	}
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil || request.ClientID == "" {
		http.Error(w, "invalid naming policy", http.StatusBadRequest)
		return
	}
	if _, err := h.hub.UpdateNamingPolicy(request.ClientID, request.Policy); err != nil {
		writeCollaborationError(w, err)
		return
	}
	h.logger.Printf("[collab] naming policy client=%s table_pluralization=%s", request.ClientID, request.Policy.TablePluralization)
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) updateVocabulary(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var request struct {
		ClientID string                        `json:"clientId"`
		Entry    collaboration.VocabularyEntry `json:"entry"`
		Create   bool                          `json:"create"`
		Delete   bool                          `json:"delete"`
	}
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil || request.ClientID == "" || request.Entry.ID == "" {
		http.Error(w, "invalid vocabulary update", http.StatusBadRequest)
		return
	}
	if _, err := h.hub.UpdateVocabulary(request.ClientID, request.Entry, request.Create, request.Delete); err != nil {
		writeCollaborationError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
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
		CanvasID *string  `json:"canvasId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil || request.ClientID == "" {
		http.Error(w, "invalid user update", http.StatusBadRequest)
		return
	}
	result, err := h.hub.UpdateUser(request.ClientID, request.Name, request.X, request.Y, request.CanvasID)
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
		CanvasID string                  `json:"canvasId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil || request.ClientID == "" || request.Seed.ID == "" {
		http.Error(w, "invalid seed update", http.StatusBadRequest)
		return
	}
	if request.CanvasID == "" {
		request.CanvasID = collaboration.DefaultCanvasID
	}
	result, err := h.hub.UpdateSeedInCanvas(request.ClientID, request.CanvasID, request.Seed, request.Create)
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

func (h *Handler) updateCanvas(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var request struct {
		ClientID string               `json:"clientId"`
		Canvas   collaboration.Canvas `json:"canvas"`
		Create   bool                 `json:"create"`
	}
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil || request.ClientID == "" || request.Canvas.ID == "" {
		http.Error(w, "invalid canvas update", http.StatusBadRequest)
		return
	}
	if _, err := h.hub.UpdateCanvas(request.ClientID, request.Canvas, request.Create); err != nil {
		writeCollaborationError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) updatePlacement(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var request struct {
		ClientID  string                             `json:"clientId"`
		Placement collaboration.CanvasModelPlacement `json:"placement"`
		Create    bool                               `json:"create"`
	}
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil || request.ClientID == "" || request.Placement.CanvasID == "" || request.Placement.SeedID == "" {
		http.Error(w, "invalid placement update", http.StatusBadRequest)
		return
	}
	if _, err := h.hub.UpdatePlacement(request.ClientID, request.Placement, request.Create); err != nil {
		writeCollaborationError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) transferOwnership(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var request struct {
		ClientID        string `json:"clientId"`
		SeedID          string `json:"seedId"`
		ExpectedOwnerID string `json:"expectedOwnerId"`
		TargetCanvasID  string `json:"targetCanvasId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil || request.ClientID == "" || request.SeedID == "" || request.ExpectedOwnerID == "" || request.TargetCanvasID == "" {
		http.Error(w, "invalid ownership transfer", http.StatusBadRequest)
		return
	}
	if _, err := h.hub.TransferOwnership(request.ClientID, request.SeedID, request.ExpectedOwnerID, request.TargetCanvasID); err != nil {
		writeCollaborationError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) applyRefinement(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var request struct {
		ClientID               string                                `json:"clientId"`
		Seeds                  []collaboration.ModelSeed             `json:"seeds"`
		Relationships          []collaboration.Relationship          `json:"relationships"`
		RelationshipReferences []collaboration.RelationshipReference `json:"relationshipReferences"`
		Domains                []collaboration.DataDomain            `json:"domains"`
		Summary                []string                              `json:"summary"`
	}
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil || request.ClientID == "" {
		http.Error(w, "invalid refinement", http.StatusBadRequest)
		return
	}
	result, err := h.hub.ApplyRefinement(request.ClientID, request.Seeds, request.Relationships, request.RelationshipReferences, request.Domains, request.Summary)
	if err != nil {
		writeCollaborationError(w, err)
		return
	}
	h.logger.Printf("[collab] refinement user=%q client=%s created_seeds=%d summary=%q", result.User.Name, request.ClientID, result.CreatedSeeds, strings.Join(result.Summary, "; "))
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) updateRelationship(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var request struct {
		ClientID     string                              `json:"clientId"`
		Relationship collaboration.Relationship          `json:"relationship"`
		Reference    collaboration.RelationshipReference `json:"reference"`
		Create       bool                                `json:"create"`
		Delete       bool                                `json:"delete"`
	}
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil || request.ClientID == "" || request.Relationship.ID == "" {
		http.Error(w, "invalid relationship update", http.StatusBadRequest)
		return
	}
	result, err := h.hub.UpdateRelationship(request.ClientID, request.Relationship, request.Reference, request.Create, request.Delete)
	if err != nil {
		writeCollaborationError(w, err)
		return
	}
	if result.Deleted {
		h.logger.Printf("[collab] delete relationship user=%q client=%s relationship=%s", result.User.Name, request.ClientID, result.Relationship.ID)
	} else if result.Created {
		h.logger.Printf("[collab] create relationship user=%q client=%s relationship=%s", result.User.Name, request.ClientID, result.Relationship.ID)
	} else {
		h.logger.Printf("[collab] edit relationship user=%q client=%s relationship=%s", result.User.Name, request.ClientID, result.Relationship.ID)
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) changeLock(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var request struct {
		ClientID string   `json:"clientId"`
		SeedID   string   `json:"seedId"`
		SeedIDs  []string `json:"seedIds"`
		Action   string   `json:"action"`
	}
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil || request.ClientID == "" || (request.SeedID == "" && len(request.SeedIDs) == 0) {
		http.Error(w, "invalid lock request", http.StatusBadRequest)
		return
	}
	seedIDs := request.SeedIDs
	if request.SeedID != "" {
		seedIDs = []string{request.SeedID}
	}
	result, err := h.hub.ChangeLocks(request.ClientID, seedIDs, request.Action)
	if errors.Is(err, collaboration.ErrLockConflict) {
		h.logger.Printf("[collab] lock rejected user=%q client=%s seeds=%s owner=%q owner_client=%s", result.User.Name, request.ClientID, strings.Join(seedIDs, ","), result.Owner.Name, result.Owner.ID)
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
			h.logger.Printf("[collab] unlock user=%q client=%s seeds=%s", result.User.Name, request.ClientID, strings.Join(seedIDs, ","))
		}
		writeJSON(w, map[string]bool{"acquired": false})
		return
	}
	h.logger.Printf("[collab] lock user=%q client=%s seeds=%s", result.User.Name, request.ClientID, strings.Join(seedIDs, ","))
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
	case errors.Is(err, collaboration.ErrUnknownClient), errors.Is(err, collaboration.ErrSeedNotFound), errors.Is(err, collaboration.ErrRelationshipNotFound), errors.Is(err, collaboration.ErrDomainNotFound), errors.Is(err, collaboration.ErrCategoryNotFound), errors.Is(err, collaboration.ErrVocabularyNotFound), errors.Is(err, collaboration.ErrCanvasNotFound), errors.Is(err, collaboration.ErrPlacementNotFound):
		status = http.StatusNotFound
	case errors.Is(err, collaboration.ErrSeedExists), errors.Is(err, collaboration.ErrLockRequired), errors.Is(err, collaboration.ErrLockConflict), errors.Is(err, collaboration.ErrDomainExists), errors.Is(err, collaboration.ErrDomainInUse), errors.Is(err, collaboration.ErrCategoryExists), errors.Is(err, collaboration.ErrVocabularyExists), errors.Is(err, collaboration.ErrCanvasExists), errors.Is(err, collaboration.ErrPlacementExists), errors.Is(err, collaboration.ErrReadonlyPlacement), errors.Is(err, collaboration.ErrOwnershipChanged):
		status = http.StatusConflict
	case errors.Is(err, collaboration.ErrRelationshipInvalid), errors.Is(err, collaboration.ErrDomainInvalid), errors.Is(err, collaboration.ErrCategoryInvalid), errors.Is(err, collaboration.ErrNamingPolicyInvalid), errors.Is(err, collaboration.ErrVocabularyInvalid), errors.Is(err, collaboration.ErrCanvasInvalid), errors.Is(err, collaboration.ErrPlacementInvalid), errors.Is(err, collaboration.ErrDFDInvalid):
		status = http.StatusBadRequest
	}
	http.Error(w, err.Error(), status)
}
