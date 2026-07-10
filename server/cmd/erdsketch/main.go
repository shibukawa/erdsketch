package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

type SeedFile struct {
	Path string `json:"path"`
	Text string `json:"text"`
}

type ModelSeed struct {
	ID          string  `json:"id"`
	Title       string  `json:"title"`
	Description string  `json:"description"`
	X           float64 `json:"x"`
	Y           float64 `json:"y"`
	Role        string  `json:"role"`
	Dependency  string  `json:"dependency"`
	HasPrivacy  bool    `json:"hasPrivacy"`
	Roughness   float64 `json:"roughness"`
	Rotation    float64 `json:"rotation"`
}

type Collaborator struct {
	ID     string  `json:"id"`
	Name   string  `json:"name"`
	Color  string  `json:"color"`
	X      float64 `json:"x"`
	Y      float64 `json:"y"`
	Online bool    `json:"online"`
}

type CollaborationState struct {
	Seeds []ModelSeed             `json:"seeds"`
	Users []Collaborator          `json:"users"`
	Locks map[string]Collaborator `json:"locks"`
}

type Hub struct {
	mu      sync.Mutex
	seeds   []ModelSeed
	users   map[string]Collaborator
	locks   map[string]string
	streams map[string]chan []byte
}

func NewHub() *Hub {
	return &Hub{
		users:   make(map[string]Collaborator),
		locks:   make(map[string]string),
		streams: make(map[string]chan []byte),
	}
}

func (h *Hub) snapshotLocked() CollaborationState {
	users := make([]Collaborator, 0, len(h.users))
	for _, user := range h.users {
		users = append(users, user)
	}
	locks := make(map[string]Collaborator, len(h.locks))
	for seedID, userID := range h.locks {
		if user, ok := h.users[userID]; ok {
			locks[seedID] = user
		}
	}
	seeds := append([]ModelSeed(nil), h.seeds...)
	return CollaborationState{Seeds: seeds, Users: users, Locks: locks}
}

func (h *Hub) broadcastLocked() {
	payload, err := json.Marshal(h.snapshotLocked())
	if err != nil {
		return
	}
	for _, stream := range h.streams {
		select {
		case stream <- payload:
		default:
			// Keep slow clients current instead of queuing stale cursor positions.
			select {
			case <-stream:
			default:
			}
			select {
			case stream <- payload:
			default:
			}
		}
	}
}

func (h *Hub) join(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var request struct {
		User  Collaborator `json:"user"`
		Seeds []ModelSeed  `json:"seeds"`
	}
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil || request.User.ID == "" || request.User.Name == "" {
		http.Error(w, "invalid join request", http.StatusBadRequest)
		return
	}

	h.mu.Lock()
	_, alreadyJoined := h.users[request.User.ID]
	request.User.Online = true
	h.users[request.User.ID] = request.User
	if len(h.seeds) == 0 && len(request.Seeds) > 0 {
		h.seeds = append([]ModelSeed(nil), request.Seeds...)
	}
	state := h.snapshotLocked()
	h.broadcastLocked()
	online := len(h.users)
	h.mu.Unlock()
	if !alreadyJoined {
		log.Printf("[collab] join user=%q client=%s online=%d", request.User.Name, request.User.ID, online)
	}
	writeJSON(w, state)
}

func (h *Hub) events(w http.ResponseWriter, r *http.Request) {
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
	stream := make(chan []byte, 1)

	h.mu.Lock()
	h.streams[clientID] = stream
	initial, _ := json.Marshal(h.snapshotLocked())
	user := h.users[clientID]
	h.mu.Unlock()
	log.Printf("[collab] stream connected user=%q client=%s", user.Name, clientID)

	_, _ = fmt.Fprintf(w, "data: %s\n\n", initial)
	flusher.Flush()
	keepAlive := time.NewTicker(20 * time.Second)
	defer keepAlive.Stop()
	defer func() {
		h.mu.Lock()
		if h.streams[clientID] != stream {
			h.mu.Unlock()
			return
		}
		departingUser := h.users[clientID]
		delete(h.streams, clientID)
		delete(h.users, clientID)
		released := 0
		for seedID, ownerID := range h.locks {
			if ownerID == clientID {
				delete(h.locks, seedID)
				released++
			}
		}
		h.broadcastLocked()
		h.mu.Unlock()
		log.Printf("[collab] leave user=%q client=%s released_locks=%d", departingUser.Name, clientID, released)
	}()

	for {
		select {
		case <-r.Context().Done():
			return
		case payload := <-stream:
			_, _ = fmt.Fprintf(w, "data: %s\n\n", payload)
			flusher.Flush()
		case <-keepAlive.C:
			_, _ = fmt.Fprint(w, ": keep-alive\n\n")
			flusher.Flush()
		}
	}
}

func (h *Hub) updateUser(w http.ResponseWriter, r *http.Request) {
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
	h.mu.Lock()
	user, ok := h.users[request.ClientID]
	if !ok {
		h.mu.Unlock()
		http.Error(w, "unknown client", http.StatusNotFound)
		return
	}
	if request.Name != nil && strings.TrimSpace(*request.Name) != "" {
		oldName := user.Name
		user.Name = strings.TrimSpace(*request.Name)
		if user.Name != oldName {
			log.Printf("[collab] rename user=%q previous=%q client=%s", user.Name, oldName, request.ClientID)
		}
	}
	if request.X != nil {
		user.X = *request.X
	}
	if request.Y != nil {
		user.Y = *request.Y
	}
	h.users[request.ClientID] = user
	h.broadcastLocked()
	h.mu.Unlock()
	w.WriteHeader(http.StatusNoContent)
}

func (h *Hub) updateSeed(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var request struct {
		ClientID string    `json:"clientId"`
		Seed     ModelSeed `json:"seed"`
		Create   bool      `json:"create"`
	}
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil || request.ClientID == "" || request.Seed.ID == "" {
		http.Error(w, "invalid seed update", http.StatusBadRequest)
		return
	}
	h.mu.Lock()
	if _, ok := h.users[request.ClientID]; !ok {
		h.mu.Unlock()
		http.Error(w, "unknown client", http.StatusNotFound)
		return
	}
	seedIndex := -1
	for index := range h.seeds {
		if h.seeds[index].ID == request.Seed.ID {
			seedIndex = index
			break
		}
	}
	if seedIndex >= 0 {
		if request.Create {
			h.mu.Unlock()
			http.Error(w, "seed already exists", http.StatusConflict)
			return
		}
		if h.locks[request.Seed.ID] != request.ClientID {
			h.mu.Unlock()
			http.Error(w, "seed is not locked by this client", http.StatusConflict)
			return
		}
		previous := h.seeds[seedIndex]
		h.seeds[seedIndex] = request.Seed
		user := h.users[request.ClientID]
		log.Printf("[collab] edit user=%q client=%s seed=%s fields=%s", user.Name, request.ClientID, request.Seed.ID, strings.Join(seedChanges(previous, request.Seed), ","))
	} else if request.Create {
		h.seeds = append(h.seeds, request.Seed)
		user := h.users[request.ClientID]
		log.Printf("[collab] create user=%q client=%s seed=%s title=%q position=(%.1f,%.1f)", user.Name, request.ClientID, request.Seed.ID, request.Seed.Title, request.Seed.X, request.Seed.Y)
	} else {
		h.mu.Unlock()
		http.Error(w, "seed not found", http.StatusNotFound)
		return
	}
	h.broadcastLocked()
	h.mu.Unlock()
	w.WriteHeader(http.StatusNoContent)
}

func (h *Hub) lockSeed(w http.ResponseWriter, r *http.Request) {
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

	h.mu.Lock()
	defer h.mu.Unlock()
	user, ok := h.users[request.ClientID]
	if !ok {
		http.Error(w, "unknown client", http.StatusNotFound)
		return
	}
	if request.Action == "unlock" {
		if h.locks[request.SeedID] == request.ClientID {
			delete(h.locks, request.SeedID)
			log.Printf("[collab] unlock user=%q client=%s seed=%s", user.Name, request.ClientID, request.SeedID)
		}
		h.broadcastLocked()
		writeJSON(w, map[string]bool{"acquired": false})
		return
	}
	if ownerID, exists := h.locks[request.SeedID]; exists && ownerID != request.ClientID {
		owner := h.users[ownerID]
		log.Printf("[collab] lock rejected user=%q client=%s seed=%s owner=%q owner_client=%s", user.Name, request.ClientID, request.SeedID, owner.Name, ownerID)
		w.WriteHeader(http.StatusConflict)
		writeJSON(w, map[string]bool{"acquired": false})
		return
	}
	// A client edits one card at a time; selecting another releases its old lock.
	for seedID, ownerID := range h.locks {
		if ownerID == request.ClientID && seedID != request.SeedID {
			delete(h.locks, seedID)
		}
	}
	h.locks[request.SeedID] = request.ClientID
	log.Printf("[collab] lock user=%q client=%s seed=%s", user.Name, request.ClientID, request.SeedID)
	h.broadcastLocked()
	writeJSON(w, map[string]bool{"acquired": true})
}

func seedChanges(previous, next ModelSeed) []string {
	changes := make([]string, 0, 9)
	if previous.Title != next.Title {
		changes = append(changes, "title")
	}
	if previous.Description != next.Description {
		changes = append(changes, "description")
	}
	if previous.X != next.X || previous.Y != next.Y {
		changes = append(changes, fmt.Sprintf("position(%.1f,%.1f)", next.X, next.Y))
	}
	if previous.Role != next.Role {
		changes = append(changes, "role")
	}
	if previous.Dependency != next.Dependency {
		changes = append(changes, "dependency")
	}
	if previous.HasPrivacy != next.HasPrivacy {
		changes = append(changes, "privacy")
	}
	if previous.Roughness != next.Roughness {
		changes = append(changes, "roughness")
	}
	if previous.Rotation != next.Rotation {
		changes = append(changes, "rotation")
	}
	if len(changes) == 0 {
		return []string{"none"}
	}
	return changes
}

func writeJSON(w http.ResponseWriter, value any) {
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(value); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

func main() {
	address := os.Getenv("ERDSKETCH_ADDR")
	if address == "" {
		address = "127.0.0.1:8080"
	}
	hub := NewHub()
	mux := http.NewServeMux()
	mux.HandleFunc("/api/health", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"ok":true}`))
	})
	mux.HandleFunc("/api/seeds", listSeeds)
	mux.HandleFunc("/api/collaboration/join", hub.join)
	mux.HandleFunc("/api/collaboration/events", hub.events)
	mux.HandleFunc("/api/collaboration/user", hub.updateUser)
	mux.HandleFunc("/api/collaboration/seed", hub.updateSeed)
	mux.HandleFunc("/api/collaboration/lock", hub.lockSeed)

	log.Printf("erdsketch backend listening on http://%s", address)
	log.Fatal(http.ListenAndServe(address, mux))
}

func listSeeds(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	files, err := filepath.Glob("model/seeds/*.seed.yaml")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	seeds := make([]SeedFile, 0, len(files))
	for _, path := range files {
		text, err := os.ReadFile(path)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		seeds = append(seeds, SeedFile{
			Path: strings.TrimPrefix(path, "./"),
			Text: string(text),
		})
	}

	writeJSON(w, seeds)
}
