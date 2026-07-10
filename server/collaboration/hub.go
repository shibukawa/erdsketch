package collaboration

import (
	"fmt"
	"reflect"
	"strings"
	"sync"
)

type Hub struct {
	mu      sync.Mutex
	seeds   []ModelSeed
	users   map[string]Collaborator
	locks   map[string]string
	streams map[string]chan State
}

func NewHub() *Hub {
	return &Hub{
		users:   make(map[string]Collaborator),
		locks:   make(map[string]string),
		streams: make(map[string]chan State),
	}
}

func (h *Hub) Join(user Collaborator, seeds []ModelSeed) JoinResult {
	h.mu.Lock()
	defer h.mu.Unlock()

	_, alreadyJoined := h.users[user.ID]
	user.Online = true
	h.users[user.ID] = user
	if len(h.seeds) == 0 && len(seeds) > 0 {
		h.seeds = append([]ModelSeed(nil), seeds...)
	}
	result := JoinResult{
		State:         h.snapshotLocked(),
		AlreadyJoined: alreadyJoined,
		Online:        len(h.users),
	}
	h.broadcastLocked()
	return result
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
	for lockedSeedID, ownerID := range h.locks {
		if ownerID == clientID && lockedSeedID != seedID {
			delete(h.locks, lockedSeedID)
		}
	}
	h.locks[seedID] = clientID
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
		Seeds: append([]ModelSeed(nil), h.seeds...),
		Users: users,
		Locks: locks,
	}
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
