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
	domains                []DataDomain
	domainCategories       []DomainCategory
	users                  map[string]Collaborator
	locks                  map[string]string
	streams                map[string]chan State
}

func NewHub() *Hub {
	return &Hub{
		domainCategories: []DomainCategory{{ID: "primitive", Name: "Primitive", System: true}, {ID: "user-defined", Name: "User Defined"}},
		users:            make(map[string]Collaborator),
		locks:            make(map[string]string),
		streams:          make(map[string]chan State),
	}
}

func (h *Hub) Join(user Collaborator, seeds []ModelSeed, relationships []Relationship, references []RelationshipReference, initialDomains ...[]DataDomain) JoinResult {
	h.mu.Lock()
	defer h.mu.Unlock()

	_, alreadyJoined := h.users[user.ID]
	user.Online = true
	h.users[user.ID] = user
	if len(h.seeds) == 0 && len(seeds) > 0 {
		h.seeds = append([]ModelSeed(nil), seeds...)
		h.relationships = append([]Relationship(nil), relationships...)
		h.relationshipReferences = append([]RelationshipReference(nil), references...)
		if len(initialDomains) > 0 {
			h.domains = normalizeDomains(initialDomains[0])
		}
	}
	result := JoinResult{
		State:         h.snapshotLocked(),
		AlreadyJoined: alreadyJoined,
		Online:        len(h.users),
	}
	h.broadcastLocked()
	return result
}

func (h *Hub) UpdateCategory(clientID string, next DomainCategory, create bool) (CategoryUpdate, error) {
	h.mu.Lock()
	defer h.mu.Unlock()

	user, ok := h.users[clientID]
	if !ok {
		return CategoryUpdate{}, ErrUnknownClient
	}
	if next.ID == "" || strings.TrimSpace(next.Name) == "" {
		return CategoryUpdate{}, ErrCategoryInvalid
	}
	index := categoryIndex(h.domainCategories, next.ID)
	for candidateIndex, candidate := range h.domainCategories {
		if candidateIndex != index && candidate.Name == next.Name {
			return CategoryUpdate{}, ErrCategoryExists
		}
	}
	result := CategoryUpdate{User: user, Category: next}
	if index >= 0 {
		if create || h.domainCategories[index].System {
			return CategoryUpdate{}, ErrCategoryInvalid
		}
		next.System = false
		h.domainCategories[index] = next
	} else {
		if !create || next.System {
			return CategoryUpdate{}, ErrCategoryInvalid
		}
		h.domainCategories = append(h.domainCategories, next)
		result.Created = true
	}
	h.broadcastLocked()
	return result, nil
}

func (h *Hub) UpdateDomain(clientID string, next DataDomain, create, remove bool) (DomainUpdate, error) {
	h.mu.Lock()
	defer h.mu.Unlock()

	user, ok := h.users[clientID]
	if !ok {
		return DomainUpdate{}, ErrUnknownClient
	}
	index := domainIndex(h.domains, next.ID)
	if next.CategoryID == "" {
		next.CategoryID = "user-defined"
	}
	if categoryIndex(h.domainCategories, next.CategoryID) < 0 || (next.System && next.CategoryID != "primitive") || (!next.System && next.CategoryID == "primitive") {
		return DomainUpdate{}, ErrCategoryInvalid
	}
	result := DomainUpdate{User: user, Domain: next}
	if remove {
		if index < 0 {
			return DomainUpdate{}, ErrDomainNotFound
		}
		if domainInUse(h.seeds, h.domains, next.ID) {
			return DomainUpdate{}, ErrDomainInUse
		}
		h.domains = append(h.domains[:index], h.domains[index+1:]...)
		result.Deleted = true
		h.broadcastLocked()
		return result, nil
	}
	if !validDomain(next, h.domains, index) {
		return DomainUpdate{}, ErrDomainInvalid
	}
	if index >= 0 && h.domains[index].Shape == "scalar" && next.Shape != "scalar" && domainReferencedByComposite(h.domains, next.ID) {
		return DomainUpdate{}, ErrDomainInUse
	}
	for candidateIndex, candidate := range h.domains {
		if candidateIndex != index && candidate.Name == next.Name {
			return DomainUpdate{}, ErrDomainExists
		}
	}
	if index >= 0 {
		if create {
			return DomainUpdate{}, ErrDomainExists
		}
		h.domains[index] = next
	} else {
		if !create {
			return DomainUpdate{}, ErrDomainNotFound
		}
		h.domains = append(h.domains, next)
		result.Created = true
	}
	h.broadcastLocked()
	return result, nil
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
	if !fieldDomainsExist(next.Fields, h.domains) {
		return SeedUpdate{}, ErrDomainNotFound
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
		Domains:                append([]DataDomain(nil), h.domains...),
		DomainCategories:       append([]DomainCategory(nil), h.domainCategories...),
		Users:                  users,
		Locks:                  locks,
	}
}

func normalizeDomains(domains []DataDomain) []DataDomain {
	normalized := append([]DataDomain(nil), domains...)
	for index := range normalized {
		if normalized[index].CategoryID == "" {
			if normalized[index].System {
				normalized[index].CategoryID = "primitive"
			} else {
				normalized[index].CategoryID = "user-defined"
			}
		}
	}
	return normalized
}

func categoryIndex(categories []DomainCategory, id string) int {
	for index, category := range categories {
		if category.ID == id {
			return index
		}
	}
	return -1
}

func domainIndex(domains []DataDomain, id string) int {
	for index, domain := range domains {
		if domain.ID == id {
			return index
		}
	}
	return -1
}

func domainAssigned(seeds []ModelSeed, domainID string) bool {
	for _, seed := range seeds {
		for _, field := range seed.Fields {
			if field.DomainID == domainID {
				return true
			}
		}
	}
	return false
}

func domainInUse(seeds []ModelSeed, domains []DataDomain, domainID string) bool {
	return domainAssigned(seeds, domainID) || domainReferencedByComposite(domains, domainID)
}

func fieldDomainsExist(fields []ModelField, domains []DataDomain) bool {
	for _, field := range fields {
		if field.DomainID == "" {
			if field.UseDomainName || strings.TrimSpace(field.Name) == "" {
				return false
			}
			continue
		}
		index := domainIndex(domains, field.DomainID)
		if index < 0 {
			return false
		}
		if strings.TrimSpace(field.Name) == "" && !field.UseDomainName {
			return false
		}
	}
	return true
}

func domainReferencedByComposite(domains []DataDomain, domainID string) bool {
	for _, domain := range domains {
		for _, component := range domain.Components {
			if component.DomainID == domainID {
				return true
			}
		}
	}
	return false
}

func validDomain(domain DataDomain, domains []DataDomain, updatingIndex int) bool {
	if domain.ID == "" || strings.TrimSpace(domain.Name) == "" {
		return false
	}
	if domain.Shape == "unresolved" {
		return domain.PrimitiveType == "" && len(domain.Components) == 0
	}
	if domain.Shape == "primitive" || domain.Shape == "scalar" {
		return validPrimitiveType(domain.PrimitiveType) && len(domain.Components) == 0 && validPrimitiveParameters(domain)
	}
	if domain.Shape != "composite" {
		return false
	}
	componentNames := make(map[string]bool, len(domain.Components))
	for _, component := range domain.Components {
		if component.ID == "" || strings.TrimSpace(component.Name) == "" || componentNames[component.Name] {
			return false
		}
		componentNames[component.Name] = true
		if component.DomainID == "" {
			continue
		}
		componentIndex := domainIndex(domains, component.DomainID)
		if componentIndex < 0 || componentIndex == updatingIndex || (domains[componentIndex].Shape != "scalar" && domains[componentIndex].Shape != "primitive") {
			return false
		}
	}
	return true
}

func validPrimitiveType(value string) bool {
	switch value {
	case "integer", "decimal", "floating_point", "varchar", "text", "blob", "date", "time", "datetime", "datetime_with_timezone", "boolean", "uuid":
		return true
	default:
		return false
	}
}

func validPrimitiveParameters(domain DataDomain) bool {
	if domain.Bits != 0 && domain.Bits != 8 && domain.Bits != 16 && domain.Bits != 32 && domain.Bits != 64 {
		return false
	}
	if domain.Length < 0 || domain.Precision < 0 || domain.Scale < 0 || domain.Scale > domain.Precision {
		return false
	}
	return true
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
