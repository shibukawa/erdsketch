package collaboration

import (
	"fmt"
	"reflect"
	"strings"
	"sync"
)

type Hub struct {
	mu                     sync.Mutex
	seeds                  []ModelSeed
	relationships          []Relationship
	relationshipReferences []RelationshipReference
	users                  map[string]Collaborator
	locks                  map[string]string
	streams                map[string]chan State
}

func NewHub() *Hub {
	return &Hub{
		users:   make(map[string]Collaborator),
		locks:   make(map[string]string),
		streams: make(map[string]chan State),
	}
}

func (h *Hub) Join(user Collaborator, seeds []ModelSeed, relationships []Relationship, references []RelationshipReference) JoinResult {
	h.mu.Lock()
	defer h.mu.Unlock()

	_, alreadyJoined := h.users[user.ID]
	user.Online = true
	h.users[user.ID] = user
	if len(h.seeds) == 0 && len(seeds) > 0 {
		h.seeds = append([]ModelSeed(nil), seeds...)
		h.relationships = append([]Relationship(nil), relationships...)
		h.relationshipReferences = append([]RelationshipReference(nil), references...)
	}
	result := JoinResult{
		State:         h.snapshotLocked(),
		AlreadyJoined: alreadyJoined,
		Online:        len(h.users),
	}
	h.broadcastLocked()
	return result
}

func (h *Hub) UpdateRelationship(clientID string, next Relationship, reference RelationshipReference, create, remove bool) (RelationshipUpdate, error) {
	h.mu.Lock()
	defer h.mu.Unlock()

	user, ok := h.users[clientID]
	if !ok {
		return RelationshipUpdate{}, ErrUnknownClient
	}
	if next.ID == "" || next.SourceID == "" || next.TargetID == "" || next.SourceID == next.TargetID || next.Name == "" || !h.hasSeed(next.SourceID) || !h.hasSeed(next.TargetID) || !validMultiplicity(next.SourceMultiplicity) || !validMultiplicity(next.TargetMultiplicity) || !validDirection(next.Direction) {
		return RelationshipUpdate{}, ErrRelationshipInvalid
	}
	if !h.hasSeedLockedBy(next.SourceID, clientID) || !h.hasSeedLockedBy(next.TargetID, clientID) {
		return RelationshipUpdate{}, ErrLockRequired
	}

	index := relationshipIndex(h.relationships, next.ID)
	result := RelationshipUpdate{User: user, Relationship: next, Reference: reference}
	if remove {
		if index < 0 {
			return RelationshipUpdate{}, ErrRelationshipNotFound
		}
		h.relationships = append(h.relationships[:index], h.relationships[index+1:]...)
		h.relationshipReferences = removeReferences(h.relationshipReferences, next.ID)
		result.Deleted = true
		h.broadcastLocked()
		return result, nil
	}
	if reference.ID == "" || reference.RelationshipID != next.ID {
		return RelationshipUpdate{}, ErrRelationshipInvalid
	}
	if index >= 0 {
		if create {
			return RelationshipUpdate{}, ErrSeedExists
		}
		h.relationships[index] = next
	} else {
		if !create {
			return RelationshipUpdate{}, ErrRelationshipNotFound
		}
		h.relationships = append(h.relationships, next)
		result.Created = true
	}
	h.relationshipReferences = upsertReference(h.relationshipReferences, reference)
	h.broadcastLocked()
	return result, nil
}

func (h *Hub) Subscribe(clientID string) *Subscription {
	stream := make(chan State, 1)
	h.mu.Lock()
	h.streams[clientID] = stream
	subscription := &Subscription{
		hub:      h,
		clientID: clientID,
		stream:   stream,
		initial:  h.snapshotLocked(),
		user:     h.users[clientID],
	}
	h.mu.Unlock()
	return subscription
}

func (h *Hub) UpdateUser(clientID string, name *string, x, y *float64) (UserUpdate, error) {
	h.mu.Lock()
	defer h.mu.Unlock()

	user, ok := h.users[clientID]
	if !ok {
		return UserUpdate{}, ErrUnknownClient
	}
	result := UserUpdate{User: user, PreviousName: user.Name}
	if name != nil && strings.TrimSpace(*name) != "" {
		user.Name = strings.TrimSpace(*name)
		result.Renamed = user.Name != result.PreviousName
	}
	if x != nil {
		user.X = *x
	}
	if y != nil {
		user.Y = *y
	}
	h.users[clientID] = user
	result.User = user
	h.broadcastLocked()
	return result, nil
}

func (h *Hub) UpdateSeed(clientID string, next ModelSeed, create bool) (SeedUpdate, error) {
	h.mu.Lock()
	defer h.mu.Unlock()

	user, ok := h.users[clientID]
	if !ok {
		return SeedUpdate{}, ErrUnknownClient
	}
	seedIndex := -1
	for index := range h.seeds {
		if h.seeds[index].ID == next.ID {
			seedIndex = index
			break
		}
	}

	result := SeedUpdate{User: user, Seed: next}
	if seedIndex >= 0 {
		if create {
			return SeedUpdate{}, ErrSeedExists
		}
		if h.locks[next.ID] != clientID {
			return SeedUpdate{}, ErrLockRequired
		}
		result.Changes = seedChanges(h.seeds[seedIndex], next)
		h.seeds[seedIndex] = next
	} else if create {
		result.Created = true
		h.seeds = append(h.seeds, next)
	} else {
		return SeedUpdate{}, ErrSeedNotFound
	}
	h.broadcastLocked()
	return result, nil
}

func (h *Hub) ChangeLock(clientID, seedID, action string) (LockResult, error) {
	h.mu.Lock()
	defer h.mu.Unlock()

	user, ok := h.users[clientID]
	if !ok {
		return LockResult{}, ErrUnknownClient
	}
	result := LockResult{User: user}
	if action == "unlock" {
		if h.locks[seedID] == clientID {
			delete(h.locks, seedID)
			result.Unlocked = true
		}
		h.broadcastLocked()
		return result, nil
	}
	if ownerID, exists := h.locks[seedID]; exists && ownerID != clientID {
		result.Owner = h.users[ownerID]
		return result, ErrLockConflict
	}
	h.locks[seedID] = clientID
	result.Acquired = true
	h.broadcastLocked()
	return result, nil
}

func (h *Hub) ChangeLocks(clientID string, seedIDs []string, action string) (LockResult, error) {
	h.mu.Lock()
	defer h.mu.Unlock()
	user, ok := h.users[clientID]
	if !ok {
		return LockResult{}, ErrUnknownClient
	}
	result := LockResult{User: user}
	if len(seedIDs) == 0 {
		return result, ErrSeedNotFound
	}
	if action == "unlock" {
		for _, seedID := range seedIDs {
			if h.locks[seedID] == clientID {
				delete(h.locks, seedID)
				result.Unlocked = true
			}
		}
		h.broadcastLocked()
		return result, nil
	}
	for _, seedID := range seedIDs {
		if ownerID, exists := h.locks[seedID]; exists && ownerID != clientID {
			result.Owner = h.users[ownerID]
			return result, ErrLockConflict
		}
	}
	for _, seedID := range seedIDs {
		h.locks[seedID] = clientID
	}
	result.Acquired = true
	h.broadcastLocked()
	return result, nil
}

func (h *Hub) snapshotLocked() State {
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
	return State{
		Seeds:                  append([]ModelSeed(nil), h.seeds...),
		Relationships:          append([]Relationship(nil), h.relationships...),
		RelationshipReferences: append([]RelationshipReference(nil), h.relationshipReferences...),
		Users:                  users,
		Locks:                  locks,
	}
}

func (h *Hub) hasSeedLockedBy(seedID, clientID string) bool {
	return h.locks[seedID] == clientID
}

func (h *Hub) hasSeed(seedID string) bool {
	for _, seed := range h.seeds {
		if seed.ID == seedID {
			return true
		}
	}
	return false
}

func relationshipIndex(relationships []Relationship, id string) int {
	for index, relationship := range relationships {
		if relationship.ID == id {
			return index
		}
	}
	return -1
}

func removeReferences(references []RelationshipReference, relationshipID string) []RelationshipReference {
	filtered := references[:0]
	for _, reference := range references {
		if reference.RelationshipID != relationshipID {
			filtered = append(filtered, reference)
		}
	}
	return filtered
}

func upsertReference(references []RelationshipReference, next RelationshipReference) []RelationshipReference {
	for index, reference := range references {
		if reference.RelationshipID == next.RelationshipID {
			references[index] = next
			return references
		}
	}
	return append(references, next)
}

func validMultiplicity(value string) bool {
	switch value {
	case "0..1", "1", "0..*", "1..*":
		return true
	default:
		return false
	}
}

func validDirection(value string) bool {
	return value == "source-to-target" || value == "target-to-source"
}

func (h *Hub) broadcastLocked() {
	state := h.snapshotLocked()
	for _, stream := range h.streams {
		select {
		case stream <- state:
		default:
			select {
			case <-stream:
			default:
			}
			select {
			case stream <- state:
			default:
			}
		}
	}
}

func seedChanges(previous, next ModelSeed) []string {
	changes := make([]string, 0, 9)
	if previous.Title != next.Title {
		changes = append(changes, "title")
	}
	if previous.Description != next.Description {
		changes = append(changes, "description")
	}
	if !reflect.DeepEqual(previous.Fields, next.Fields) {
		changes = append(changes, "fields")
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
	if previous.MaturedLevel != next.MaturedLevel {
		changes = append(changes, "maturedLevel")
	}
	if previous.Rotation != next.Rotation {
		changes = append(changes, "rotation")
	}
	if len(changes) == 0 {
		return []string{"none"}
	}
	return changes
}

type Subscription struct {
	hub       *Hub
	clientID  string
	stream    chan State
	initial   State
	user      Collaborator
	closeOnce sync.Once
	departure Departure
}

func (s *Subscription) Initial() State {
	return s.initial
}

func (s *Subscription) User() Collaborator {
	return s.user
}

func (s *Subscription) Updates() <-chan State {
	return s.stream
}

func (s *Subscription) Close() Departure {
	s.closeOnce.Do(func() {
		s.hub.mu.Lock()
		defer s.hub.mu.Unlock()
		if s.hub.streams[s.clientID] != s.stream {
			return
		}
		s.departure.User = s.hub.users[s.clientID]
		delete(s.hub.streams, s.clientID)
		delete(s.hub.users, s.clientID)
		for seedID, ownerID := range s.hub.locks {
			if ownerID == s.clientID {
				delete(s.hub.locks, seedID)
				s.departure.ReleasedLocks++
			}
		}
		s.hub.broadcastLocked()
	})
	return s.departure
}
