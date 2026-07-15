package collaboration

import (
	"fmt"
	"reflect"
	"strconv"
	"strings"
	"sync"
)

type Hub struct {
	mu                     sync.Mutex
	canvases               []Canvas
	placements             []CanvasModelPlacement
	seeds                  []ModelSeed
	relationships          []Relationship
	relationshipReferences []RelationshipReference
	domains                []DataDomain
	domainCategories       []DomainCategory
	namingPolicy           NamingPolicy
	vocabularyEntries      []VocabularyEntry
	dfd                    DFDState
	users                  map[string]Collaborator
	locks                  map[string]string
	streams                map[string]chan State
}

func NewHub() *Hub {
	return &Hub{
		canvases:         []Canvas{{ID: DefaultCanvasID, Name: "Main canvas"}},
		domainCategories: []DomainCategory{{ID: "primitive", Name: "Primitive", System: true}, {ID: "user-defined", Name: "User Defined"}},
		namingPolicy: NamingPolicy{
			TablePluralization: "singular",
			TableJoinMode:      "separator", TableSeparator: "_",
			FieldJoinMode: "separator", FieldSeparator: "_",
			DomainJoinMode: "concatenate", DomainSeparator: "_",
		},
		users:   make(map[string]Collaborator),
		locks:   make(map[string]string),
		streams: make(map[string]chan State),
		dfd:     defaultDFDState(),
	}
}

func (h *Hub) UpdateNamingPolicy(clientID string, next NamingPolicy) (NamingPolicyUpdate, error) {
	h.mu.Lock()
	defer h.mu.Unlock()
	user, ok := h.users[clientID]
	if !ok {
		return NamingPolicyUpdate{}, ErrUnknownClient
	}
	next = normalizeNamingPolicy(next, h.namingPolicy)
	if !validNamingPolicy(next) {
		return NamingPolicyUpdate{}, ErrNamingPolicyInvalid
	}
	h.namingPolicy = next
	h.broadcastLocked()
	return NamingPolicyUpdate{User: user, Policy: next}, nil
}

func (h *Hub) UpdateVocabulary(clientID string, next VocabularyEntry, create, remove bool) (VocabularyUpdate, error) {
	h.mu.Lock()
	defer h.mu.Unlock()
	user, ok := h.users[clientID]
	if !ok {
		return VocabularyUpdate{}, ErrUnknownClient
	}
	index := vocabularyIndex(h.vocabularyEntries, next.ID)
	result := VocabularyUpdate{User: user, Entry: next}
	if remove {
		if index < 0 {
			return VocabularyUpdate{}, ErrVocabularyNotFound
		}
		h.vocabularyEntries = append(h.vocabularyEntries[:index], h.vocabularyEntries[index+1:]...)
		result.Deleted = true
		h.broadcastLocked()
		return result, nil
	}
	if next.ID == "" || strings.TrimSpace(next.BusinessName) == "" {
		return VocabularyUpdate{}, ErrVocabularyInvalid
	}
	next.BusinessName = strings.TrimSpace(next.BusinessName)
	next.SystemName = strings.TrimSpace(next.SystemName)
	next.PhysicalName = strings.TrimSpace(next.PhysicalName)
	next.Aliases = normalizedVocabularyAliases(next.Aliases)
	if vocabularyTermConflicts(h.vocabularyEntries, index, next) {
		return VocabularyUpdate{}, ErrVocabularyExists
	}
	if index >= 0 {
		if create {
			return VocabularyUpdate{}, ErrVocabularyExists
		}
		h.vocabularyEntries[index] = next
	} else {
		if !create {
			return VocabularyUpdate{}, ErrVocabularyNotFound
		}
		h.vocabularyEntries = append(h.vocabularyEntries, next)
		result.Created = true
	}
	h.broadcastLocked()
	return result, nil
}

func normalizedVocabularyAliases(aliases []string) []string {
	result := make([]string, 0, len(aliases))
	for _, alias := range aliases {
		if trimmed := strings.TrimSpace(alias); trimmed != "" {
			result = append(result, trimmed)
		}
	}
	return result
}

func vocabularyTermConflicts(entries []VocabularyEntry, replacedIndex int, next VocabularyEntry) bool {
	claimed := make(map[string]struct{})
	for index, entry := range entries {
		if index == replacedIndex {
			continue
		}
		for _, term := range append([]string{entry.BusinessName}, entry.Aliases...) {
			claimed[strings.ToLower(strings.TrimSpace(term))] = struct{}{}
		}
	}
	local := make(map[string]struct{})
	for _, term := range append([]string{next.BusinessName}, next.Aliases...) {
		normalized := strings.ToLower(strings.TrimSpace(term))
		if normalized == "" {
			continue
		}
		if _, exists := claimed[normalized]; exists {
			return true
		}
		if _, exists := local[normalized]; exists {
			return true
		}
		local[normalized] = struct{}{}
	}
	return false
}

func (h *Hub) Join(user Collaborator, seeds []ModelSeed, relationships []Relationship, references []RelationshipReference, initialDomains ...[]DataDomain) JoinResult {
	return h.join(user, false, seeds, relationships, references, initialDomains...)
}

func (h *Hub) JoinWithNameAssignment(user Collaborator, assignAvailableName bool, seeds []ModelSeed, relationships []Relationship, references []RelationshipReference, initialDomains ...[]DataDomain) JoinResult {
	return h.join(user, assignAvailableName, seeds, relationships, references, initialDomains...)
}

func (h *Hub) join(user Collaborator, assignAvailableName bool, seeds []ModelSeed, relationships []Relationship, references []RelationshipReference, initialDomains ...[]DataDomain) JoinResult {
	h.mu.Lock()
	defer h.mu.Unlock()

	existingUser, alreadyJoined := h.users[user.ID]
	if assignAvailableName {
		if alreadyJoined {
			user.Name = existingUser.Name
		} else {
			user.Name = availableAnimalName(h.users)
		}
	}
	user.Online = true
	if canvasIndex(h.canvases, user.CanvasID) < 0 {
		user.CanvasID = DefaultCanvasID
	}
	h.users[user.ID] = user
	if len(h.seeds) == 0 && len(seeds) > 0 {
		normalizedSeeds := make([]ModelSeed, len(seeds))
		for index, seed := range seeds {
			normalizedSeeds[index] = normalizeModelSeed(seed)
		}
		h.seeds = normalizedSeeds
		h.placements = make([]CanvasModelPlacement, 0, len(seeds))
		for _, seed := range seeds {
			h.placements = append(h.placements, CanvasModelPlacement{CanvasID: DefaultCanvasID, SeedID: seed.ID, X: seed.X, Y: seed.Y, AccessMode: "owner"})
		}
		h.relationships = append([]Relationship(nil), relationships...)
		h.relationshipReferences = append([]RelationshipReference(nil), references...)
		if len(initialDomains) > 0 {
			h.domains = normalizeDomains(initialDomains[0])
		}
	}
	result := JoinResult{
		State:         h.snapshotLocked(),
		User:          user,
		AlreadyJoined: alreadyJoined,
		Online:        len(h.users),
	}
	h.broadcastLocked()
	return result
}

func (h *Hub) UpdateCanvas(clientID string, next Canvas, create bool) (CanvasUpdate, error) {
	h.mu.Lock()
	defer h.mu.Unlock()
	user, ok := h.users[clientID]
	if !ok {
		return CanvasUpdate{}, ErrUnknownClient
	}
	next.Name = strings.TrimSpace(next.Name)
	if next.ID == "" || next.Name == "" {
		return CanvasUpdate{}, ErrCanvasInvalid
	}
	index := canvasIndex(h.canvases, next.ID)
	for candidateIndex, candidate := range h.canvases {
		if candidateIndex != index && strings.EqualFold(candidate.Name, next.Name) {
			return CanvasUpdate{}, ErrCanvasExists
		}
	}
	result := CanvasUpdate{User: user, Canvas: next}
	if index >= 0 {
		if create {
			return CanvasUpdate{}, ErrCanvasExists
		}
		h.canvases[index] = next
	} else {
		if !create {
			return CanvasUpdate{}, ErrCanvasNotFound
		}
		h.canvases = append(h.canvases, next)
		result.Created = true
	}
	h.broadcastLocked()
	return result, nil
}

func (h *Hub) UpdatePlacement(clientID string, next CanvasModelPlacement, create bool) (PlacementUpdate, error) {
	h.mu.Lock()
	defer h.mu.Unlock()
	user, ok := h.users[clientID]
	if !ok {
		return PlacementUpdate{}, ErrUnknownClient
	}
	if canvasIndex(h.canvases, next.CanvasID) < 0 {
		return PlacementUpdate{}, ErrCanvasNotFound
	}
	seedIndex := seedIndexByID(h.seeds, next.SeedID)
	if seedIndex < 0 {
		return PlacementUpdate{}, ErrSeedNotFound
	}
	if normalizedUsageScope(h.seeds[seedIndex].UsageScope) == "dfd_only" {
		return PlacementUpdate{}, ErrPlacementInvalid
	}
	index := placementIndex(h.placements, next.CanvasID, next.SeedID)
	result := PlacementUpdate{User: user, Placement: next}
	if index >= 0 {
		if create {
			return PlacementUpdate{}, ErrPlacementExists
		}
		next.AccessMode = h.placements[index].AccessMode
		h.placements[index] = next
	} else {
		if !create {
			return PlacementUpdate{}, ErrPlacementNotFound
		}
		next.AccessMode = "readonly"
		if ownerCanvasID(h.placements, next.SeedID) == "" {
			next.AccessMode = "owner"
		}
		h.placements = append(h.placements, next)
		result.Created = true
	}
	result.Placement = next
	h.broadcastLocked()
	return result, nil
}

func (h *Hub) TransferOwnership(clientID, seedID, expectedOwnerID, targetCanvasID string) (OwnershipTransfer, error) {
	h.mu.Lock()
	defer h.mu.Unlock()
	user, ok := h.users[clientID]
	if !ok {
		return OwnershipTransfer{}, ErrUnknownClient
	}
	if seedIndexByID(h.seeds, seedID) < 0 {
		return OwnershipTransfer{}, ErrSeedNotFound
	}
	if canvasIndex(h.canvases, targetCanvasID) < 0 {
		return OwnershipTransfer{}, ErrCanvasNotFound
	}
	currentOwnerID := ownerCanvasID(h.placements, seedID)
	if currentOwnerID == "" || currentOwnerID != expectedOwnerID || currentOwnerID == targetCanvasID {
		return OwnershipTransfer{}, ErrOwnershipChanged
	}
	targetIndex := placementIndex(h.placements, targetCanvasID, seedID)
	if targetIndex < 0 {
		seed := h.seeds[seedIndexByID(h.seeds, seedID)]
		h.placements = append(h.placements, CanvasModelPlacement{CanvasID: targetCanvasID, SeedID: seedID, X: seed.X + 40, Y: seed.Y + 40, AccessMode: "readonly"})
		targetIndex = len(h.placements) - 1
	}
	previousIndex := placementIndex(h.placements, currentOwnerID, seedID)
	h.placements[previousIndex].AccessMode = "readonly"
	h.placements[targetIndex].AccessMode = "owner"
	delete(h.locks, seedID)
	h.broadcastLocked()
	return OwnershipTransfer{User: user, SeedID: seedID, PreviousOwnerID: currentOwnerID, TargetOwnerID: targetCanvasID}, nil
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
	if next.Kind != "foreign-key" {
		next.OnDelete = ""
	} else if next.OnDelete == "" {
		next.OnDelete = "no_action"
	}
	if next.ID == "" || next.SourceID == "" || next.TargetID == "" || next.SourceID == next.TargetID || next.Name == "" || !h.hasSeed(next.SourceID) || !h.hasSeed(next.TargetID) || !validMultiplicity(next.SourceMultiplicity) || !validMultiplicity(next.TargetMultiplicity) || !validDirection(next.Direction) || !validRelationshipKind(next.Kind) || !validReferentialAction(next.OnDelete) || (next.OnDelete == "set_null" && !relationshipForeignKeyNullable(next)) {
		return RelationshipUpdate{}, ErrRelationshipInvalid
	}
	if !h.hasSeedLockedBy(next.SourceID, clientID) || !h.hasSeedLockedBy(next.TargetID, clientID) {
		return RelationshipUpdate{}, ErrLockRequired
	}
	for _, seedID := range []string{next.SourceID, next.TargetID} {
		placement := placementIndex(h.placements, user.CanvasID, seedID)
		if placement < 0 || h.placements[placement].AccessMode != "owner" {
			return RelationshipUpdate{}, ErrReadonlyPlacement
		}
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
	for _, seedID := range reference.HiddenOnModelIDs {
		if seedID != next.SourceID && seedID != next.TargetID {
			return RelationshipUpdate{}, ErrRelationshipInvalid
		}
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

func (h *Hub) UpdateUser(clientID string, name *string, x, y *float64, canvasIDs ...*string) (UserUpdate, error) {
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
	if len(canvasIDs) > 0 && canvasIDs[0] != nil {
		if canvasIndex(h.canvases, *canvasIDs[0]) < 0 {
			return UserUpdate{}, ErrCanvasNotFound
		}
		user.CanvasID = *canvasIDs[0]
	}
	h.users[clientID] = user
	result.User = user
	h.broadcastLocked()
	return result, nil
}

func (h *Hub) UpdateSeed(clientID string, next ModelSeed, create bool) (SeedUpdate, error) {
	return h.UpdateSeedInCanvas(clientID, DefaultCanvasID, next, create)
}

func (h *Hub) UpdateSeedInCanvas(clientID, canvasID string, next ModelSeed, create bool) (SeedUpdate, error) {
	h.mu.Lock()
	defer h.mu.Unlock()

	user, ok := h.users[clientID]
	if !ok {
		return SeedUpdate{}, ErrUnknownClient
	}
	next = normalizeModelSeed(next)
	if !fieldDomainsExist(next.Fields, h.domains) {
		return SeedUpdate{}, ErrDomainNotFound
	}
	if !validModelSeed(next, h.domains) {
		return SeedUpdate{}, ErrSeedInvalid
	}
	next.UsageScope = normalizedUsageScope(next.UsageScope)
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
		placement := placementIndex(h.placements, canvasID, next.ID)
		if placement < 0 {
			return SeedUpdate{}, ErrPlacementNotFound
		}
		if h.placements[placement].AccessMode != "owner" {
			return SeedUpdate{}, ErrReadonlyPlacement
		}
		result.Changes = seedChanges(h.seeds[seedIndex], next)
		h.seeds[seedIndex] = next
	} else if create {
		if canvasIndex(h.canvases, canvasID) < 0 {
			return SeedUpdate{}, ErrCanvasNotFound
		}
		result.Created = true
		h.seeds = append(h.seeds, next)
		h.placements = append(h.placements, CanvasModelPlacement{CanvasID: canvasID, SeedID: next.ID, X: next.X, Y: next.Y, AccessMode: "owner"})
	} else {
		return SeedUpdate{}, ErrSeedNotFound
	}
	h.broadcastLocked()
	return result, nil
}

func (h *Hub) UpdateCatalogSeed(clientID string, next ModelSeed, create bool) (SeedUpdate, error) {
	h.mu.Lock()
	defer h.mu.Unlock()
	user, ok := h.users[clientID]
	if !ok {
		return SeedUpdate{}, ErrUnknownClient
	}
	next = normalizeModelSeed(next)
	if next.ID == "" || strings.TrimSpace(next.Title) == "" || !fieldDomainsExist(next.Fields, h.domains) {
		return SeedUpdate{}, ErrSeedNotFound
	}
	if !validModelSeed(next, h.domains) {
		return SeedUpdate{}, ErrSeedInvalid
	}
	next.UsageScope = normalizedUsageScope(next.UsageScope)
	index := seedIndexByID(h.seeds, next.ID)
	result := SeedUpdate{User: user, Seed: next}
	if index >= 0 {
		if create {
			return SeedUpdate{}, ErrSeedExists
		}
		if h.locks[next.ID] != clientID {
			return SeedUpdate{}, ErrLockRequired
		}
		if next.UsageScope == "dfd_only" && hasAnyPlacement(h.placements, next.ID) {
			return SeedUpdate{}, ErrPlacementInvalid
		}
		result.Changes = seedChanges(h.seeds[index], next)
		h.seeds[index] = next
	} else {
		if !create {
			return SeedUpdate{}, ErrSeedNotFound
		}
		result.Created = true
		h.seeds = append(h.seeds, next)
	}
	h.broadcastLocked()
	return result, nil
}

func normalizedUsageScope(value string) string {
	if value == "dfd_only" {
		return value
	}
	return "shared"
}

func hasAnyPlacement(placements []CanvasModelPlacement, seedID string) bool {
	for _, placement := range placements {
		if placement.SeedID == seedID {
			return true
		}
	}
	return false
}

// ApplyRefinement validates and swaps the complete modeling graph while holding
// the hub mutex, so clients never observe a partially applied transformation.
func (h *Hub) ApplyRefinement(clientID string, seeds []ModelSeed, relationships []Relationship, references []RelationshipReference, domains []DataDomain, summary []string) (RefinementUpdate, error) {
	h.mu.Lock()
	defer h.mu.Unlock()
	user, ok := h.users[clientID]
	if !ok {
		return RefinementUpdate{}, ErrUnknownClient
	}
	seedIDs := make(map[string]bool, len(seeds))
	for _, seed := range seeds {
		if seed.ID == "" || seedIDs[seed.ID] || !fieldDomainsExist(seed.Fields, domains) {
			return RefinementUpdate{}, ErrRelationshipInvalid
		}
		seedIDs[seed.ID] = true
	}
	for _, current := range h.seeds {
		index := seedIndexByID(seeds, current.ID)
		if index < 0 {
			return RefinementUpdate{}, ErrSeedNotFound
		}
		if !reflect.DeepEqual(current, seeds[index]) && h.locks[current.ID] != clientID {
			return RefinementUpdate{}, ErrLockRequired
		}
		if !reflect.DeepEqual(current, seeds[index]) {
			placement := placementIndex(h.placements, user.CanvasID, current.ID)
			if placement < 0 || h.placements[placement].AccessMode != "owner" {
				return RefinementUpdate{}, ErrReadonlyPlacement
			}
		}
	}
	domainIDs := make(map[string]bool, len(domains))
	for index, domain := range domains {
		if domain.ID == "" || domainIDs[domain.ID] || !validDomain(domain, domains, index) {
			return RefinementUpdate{}, ErrDomainInvalid
		}
		domainIDs[domain.ID] = true
	}
	for _, current := range h.domains {
		index := domainIndex(domains, current.ID)
		if index < 0 || !reflect.DeepEqual(current, domains[index]) {
			return RefinementUpdate{}, ErrDomainInvalid
		}
	}
	relationshipIDs := make(map[string]bool, len(relationships))
	for _, item := range relationships {
		if item.ID == "" || relationshipIDs[item.ID] || !seedIDs[item.SourceID] || !seedIDs[item.TargetID] || item.SourceID == item.TargetID || item.Name == "" || !validMultiplicity(item.SourceMultiplicity) || !validMultiplicity(item.TargetMultiplicity) || !validDirection(item.Direction) || !validRelationshipKind(item.Kind) {
			return RefinementUpdate{}, ErrRelationshipInvalid
		}
		relationshipIDs[item.ID] = true
		currentIndex := relationshipIndex(h.relationships, item.ID)
		if currentIndex < 0 {
			if seedIndexByID(h.seeds, item.SourceID) >= 0 && h.locks[item.SourceID] != clientID {
				return RefinementUpdate{}, ErrLockRequired
			}
			if seedIndexByID(h.seeds, item.TargetID) >= 0 && h.locks[item.TargetID] != clientID {
				return RefinementUpdate{}, ErrLockRequired
			}
		} else if !reflect.DeepEqual(h.relationships[currentIndex], item) {
			current := h.relationships[currentIndex]
			for _, seedID := range []string{current.SourceID, current.TargetID, item.SourceID, item.TargetID} {
				if seedIndexByID(h.seeds, seedID) >= 0 && h.locks[seedID] != clientID {
					return RefinementUpdate{}, ErrLockRequired
				}
			}
		}
	}
	if len(references) != len(relationships) {
		return RefinementUpdate{}, ErrRelationshipInvalid
	}
	seenReferences := make(map[string]bool, len(references))
	for _, reference := range references {
		if reference.ID == "" || seenReferences[reference.RelationshipID] || !relationshipIDs[reference.RelationshipID] {
			return RefinementUpdate{}, ErrRelationshipInvalid
		}
		seenReferences[reference.RelationshipID] = true
		item := relationships[relationshipIndex(relationships, reference.RelationshipID)]
		for _, hiddenID := range reference.HiddenOnModelIDs {
			if hiddenID != item.SourceID && hiddenID != item.TargetID {
				return RefinementUpdate{}, ErrRelationshipInvalid
			}
		}
	}
	result := RefinementUpdate{User: user, CreatedSeeds: len(seeds) - len(h.seeds), Summary: append([]string(nil), summary...)}
	for _, seed := range seeds {
		if seedIndexByID(h.seeds, seed.ID) < 0 {
			canvasID := user.CanvasID
			if canvasIndex(h.canvases, canvasID) < 0 {
				canvasID = DefaultCanvasID
			}
			h.placements = append(h.placements, CanvasModelPlacement{CanvasID: canvasID, SeedID: seed.ID, X: seed.X, Y: seed.Y, AccessMode: "owner"})
		}
	}
	h.seeds = append([]ModelSeed(nil), seeds...)
	h.relationships = append([]Relationship(nil), relationships...)
	h.relationshipReferences = append([]RelationshipReference(nil), references...)
	h.domains = normalizeDomains(domains)
	h.broadcastLocked()
	return result, nil
}

func seedIndexByID(seeds []ModelSeed, id string) int {
	for index := range seeds {
		if seeds[index].ID == id {
			return index
		}
	}
	return -1
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
		Canvases:               append([]Canvas(nil), h.canvases...),
		Placements:             append([]CanvasModelPlacement(nil), h.placements...),
		Seeds:                  append([]ModelSeed(nil), h.seeds...),
		Relationships:          append([]Relationship(nil), h.relationships...),
		RelationshipReferences: append([]RelationshipReference(nil), h.relationshipReferences...),
		Domains:                append([]DataDomain(nil), h.domains...),
		DomainCategories:       append([]DomainCategory(nil), h.domainCategories...),
		NamingPolicy:           h.namingPolicy,
		VocabularyEntries:      append([]VocabularyEntry(nil), h.vocabularyEntries...),
		DFD:                    cloneDFDState(h.dfd),
		Users:                  users,
		Locks:                  locks,
	}
}

func canvasIndex(canvases []Canvas, id string) int {
	for index, canvas := range canvases {
		if canvas.ID == id {
			return index
		}
	}
	return -1
}

func placementIndex(placements []CanvasModelPlacement, canvasID, seedID string) int {
	for index, placement := range placements {
		if placement.CanvasID == canvasID && placement.SeedID == seedID {
			return index
		}
	}
	return -1
}

func ownerCanvasID(placements []CanvasModelPlacement, seedID string) string {
	for _, placement := range placements {
		if placement.SeedID == seedID && placement.AccessMode == "owner" {
			return placement.CanvasID
		}
	}
	return ""
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

func vocabularyIndex(entries []VocabularyEntry, id string) int {
	for index, entry := range entries {
		if entry.ID == id {
			return index
		}
	}
	return -1
}

func validNamingPolicy(policy NamingPolicy) bool {
	if policy.TablePluralization != "singular" && policy.TablePluralization != "plural" {
		return false
	}
	for _, mode := range []string{policy.TableJoinMode, policy.FieldJoinMode, policy.DomainJoinMode} {
		if mode != "separator" && mode != "concatenate" {
			return false
		}
	}
	return len(policy.TableSeparator) <= 3 && len(policy.FieldSeparator) <= 3 && len(policy.DomainSeparator) <= 3
}

func normalizeNamingPolicy(policy, fallback NamingPolicy) NamingPolicy {
	if policy.TablePluralization == "" {
		policy.TablePluralization = fallback.TablePluralization
	}
	if policy.TableJoinMode == "" {
		policy.TableJoinMode = fallback.TableJoinMode
	}
	if policy.TableSeparator == "" && policy.TableJoinMode == "separator" {
		policy.TableSeparator = fallback.TableSeparator
	}
	if policy.FieldJoinMode == "" {
		policy.FieldJoinMode = fallback.FieldJoinMode
	}
	if policy.FieldSeparator == "" && policy.FieldJoinMode == "separator" {
		policy.FieldSeparator = fallback.FieldSeparator
	}
	if policy.DomainJoinMode == "" {
		policy.DomainJoinMode = fallback.DomainJoinMode
	}
	if policy.DomainSeparator == "" && policy.DomainJoinMode == "separator" {
		policy.DomainSeparator = fallback.DomainSeparator
	}
	return policy
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

func normalizeModelSeed(seed ModelSeed) ModelSeed {
	seed.Fields = append([]ModelField(nil), seed.Fields...)
	for index := range seed.Fields {
		if seed.Fields[index].PrimaryKey {
			seed.Fields[index].Required = true
			seed.Fields[index].Unique = false
		}
		if seed.Fields[index].ValueGeneration == "none" {
			seed.Fields[index].ValueGeneration = ""
		}
	}
	if seed.Role != "transaction" {
		return seed
	}
	if seed.VolumeEstimate == nil {
		seed.VolumeEstimate = &VolumeEstimate{
			GrowthRate:      GrowthRate{Period: "day"},
			RetentionPeriod: &RetentionPeriod{Value: 3, Unit: "year"},
		}
		return seed
	}
	volume := *seed.VolumeEstimate
	seed.VolumeEstimate = &volume
	if seed.VolumeEstimate.GrowthRate.Period == "" {
		seed.VolumeEstimate.GrowthRate.Period = "day"
	}
	if seed.VolumeEstimate.RetentionPeriod == nil || seed.VolumeEstimate.RetentionPeriod.Value <= 0 {
		seed.VolumeEstimate.RetentionPeriod = &RetentionPeriod{Value: 3, Unit: "year"}
	}
	return seed
}

func validModelSeed(seed ModelSeed, domains []DataDomain) bool {
	for _, field := range seed.Fields {
		if field.AverageSizeBytes != nil && *field.AverageSizeBytes < 0 {
			return false
		}
		if field.DefaultValue != nil {
			switch field.DefaultValue.Kind {
			case "literal", "current_date", "current_timestamp":
			default:
				return false
			}
		}
		switch field.ValueGeneration {
		case "":
		case "auto_increment":
			if !field.PrimaryKey || effectiveDomainPrimitiveType(field.DomainID, domains, make(map[string]bool)) != "integer" {
				return false
			}
		default:
			return false
		}
	}
	if seed.VolumeEstimate != nil {
		volume := seed.VolumeEstimate
		if volume.InitialRecordCount < 0 || volume.GrowthRate.Amount < 0 {
			return false
		}
		switch volume.GrowthRate.Period {
		case "hour", "day", "month":
		default:
			return false
		}
		if volume.MaximumRecordCount != nil && *volume.MaximumRecordCount < 0 {
			return false
		}
	}
	if seed.Role == "transaction" {
		retention := seed.VolumeEstimate.RetentionPeriod
		if retention == nil || retention.Value <= 0 {
			return false
		}
		switch retention.Unit {
		case "hour", "day", "month", "year":
		default:
			return false
		}
	}
	return validIndexDefinitions(seed, domains) && validPartitionScheme(seed, domains)
}

func validIndexDefinitions(seed ModelSeed, domains []DataDomain) bool {
	ids := make(map[string]bool)
	names := make(map[string]bool)
	for _, index := range seed.Indexes {
		name := strings.ToLower(strings.TrimSpace(index.Name))
		if index.ID == "" || ids[index.ID] || name == "" || names[name] || len(index.Keys) == 0 {
			return false
		}
		ids[index.ID] = true
		names[name] = true
		keys := make(map[string]bool)
		for _, key := range index.Keys {
			if key.Direction != "ascending" && key.Direction != "descending" {
				return false
			}
			if key.Source != "field" && key.Source != "relationship" {
				return false
			}
			if key.Source == "field" && !validPhysicalFieldReference(seed.Fields, domains, key.SourceID, key.ComponentID) {
				return false
			}
			if key.Source == "relationship" && (key.SourceID == "" || key.ComponentID != "") {
				return false
			}
			identity := key.Source + ":" + key.SourceID + ":" + key.ComponentID
			if keys[identity] {
				return false
			}
			keys[identity] = true
		}
	}
	return true
}

func validPartitionScheme(seed ModelSeed, domains []DataDomain) bool {
	partitioning := seed.Partitioning
	if partitioning == nil {
		return true
	}
	if partitioning.Strategy != "range" || len(partitioning.Keys) == 0 {
		return false
	}
	keys := make(map[string]bool)
	for _, key := range partitioning.Keys {
		if !validPhysicalFieldReference(seed.Fields, domains, key.FieldID, key.ComponentID) {
			return false
		}
		identity := key.FieldID + ":" + key.ComponentID
		if keys[identity] {
			return false
		}
		keys[identity] = true
	}
	ids := make(map[string]bool)
	names := make(map[string]bool)
	for _, partitionRange := range partitioning.Ranges {
		name := strings.ToLower(strings.TrimSpace(partitionRange.Name))
		if partitionRange.ID == "" || ids[partitionRange.ID] || name == "" || names[name] || len(partitionRange.From) != len(partitioning.Keys) || len(partitionRange.To) != len(partitioning.Keys) {
			return false
		}
		ids[partitionRange.ID] = true
		names[name] = true
		for _, bound := range append(append([]PartitionBound(nil), partitionRange.From...), partitionRange.To...) {
			switch bound.Kind {
			case "literal":
				if strings.TrimSpace(bound.Value) == "" {
					return false
				}
			case "minvalue", "maxvalue":
			default:
				return false
			}
		}
	}
	return true
}

func validPhysicalFieldReference(fields []ModelField, domains []DataDomain, fieldID, componentID string) bool {
	for _, field := range fields {
		if field.ID != fieldID {
			continue
		}
		if componentID == "" {
			return true
		}
		index := domainIndex(domains, field.DomainID)
		if index < 0 {
			return false
		}
		for _, component := range domains[index].Components {
			if component.ID == componentID {
				return true
			}
		}
		return false
	}
	return false
}

func effectiveDomainPrimitiveType(domainID string, domains []DataDomain, seen map[string]bool) string {
	if domainID == "" || seen[domainID] {
		return ""
	}
	seen[domainID] = true
	index := domainIndex(domains, domainID)
	if index < 0 {
		return ""
	}
	domain := domains[index]
	if domain.PrimitiveType != "" {
		return domain.PrimitiveType
	}
	if domain.Shape == "scalar" && len(domain.Components) == 1 {
		return effectiveDomainPrimitiveType(domain.Components[0].DomainID, domains, seen)
	}
	return ""
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
	case "integer", "decimal", "floating_point", "varchar", "text", "blob", "date", "time", "datetime", "datetime_with_timezone", "boolean", "uuid", "code_set":
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
	if domain.PrimitiveType != "code_set" {
		return domain.CodeSetBaseType == "" && len(domain.CodeSetEntries) == 0
	}
	if domain.CodeSetBaseType != "varchar" && domain.CodeSetBaseType != "decimal" && domain.CodeSetBaseType != "integer" {
		return false
	}
	entryIDs := make(map[string]bool, len(domain.CodeSetEntries))
	entryNames := make(map[string]bool, len(domain.CodeSetEntries))
	for _, entry := range domain.CodeSetEntries {
		name := strings.TrimSpace(entry.Name)
		if entry.ID == "" || name == "" || entryIDs[entry.ID] || entryNames[name] || !validCodeSetValue(entry.Value, domain.CodeSetBaseType) {
			return false
		}
		entryIDs[entry.ID] = true
		entryNames[name] = true
	}
	return true
}

func validCodeSetValue(value, baseType string) bool {
	if value == "" || baseType == "varchar" {
		return true
	}
	if baseType == "integer" {
		_, err := strconv.ParseInt(value, 10, 64)
		return err == nil
	}
	_, err := strconv.ParseFloat(value, 64)
	return err == nil
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

func validRelationshipKind(value string) bool {
	switch value {
	case "", "foreign-key", "inherit", "label":
		return true
	default:
		return false
	}
}

func validReferentialAction(value string) bool {
	switch value {
	case "", "no_action", "restrict", "cascade", "set_null":
		return true
	default:
		return false
	}
}

func relationshipForeignKeyNullable(relationship Relationship) bool {
	sourceMany := relationship.SourceMultiplicity == "0..*" || relationship.SourceMultiplicity == "1..*"
	targetMany := relationship.TargetMultiplicity == "0..*" || relationship.TargetMultiplicity == "1..*"
	if sourceMany && !targetMany {
		return relationship.TargetMultiplicity == "0..1"
	}
	if targetMany && !sourceMany {
		return relationship.SourceMultiplicity == "0..1"
	}
	if sourceMany && targetMany {
		return false
	}
	if relationship.Direction == "source-to-target" {
		return relationship.TargetMultiplicity == "0..1"
	}
	return relationship.SourceMultiplicity == "0..1"
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
	changes := make([]string, 0, 16)
	if previous.Title != next.Title {
		changes = append(changes, "title")
	}
	if !reflect.DeepEqual(previous.Names, next.Names) {
		changes = append(changes, "names")
	}
	if !reflect.DeepEqual(previous.VocabularyBinding, next.VocabularyBinding) {
		changes = append(changes, "vocabularyBinding")
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
	if normalizedUsageScope(previous.UsageScope) != normalizedUsageScope(next.UsageScope) {
		changes = append(changes, "usageScope")
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
	if !reflect.DeepEqual(previous.Indexes, next.Indexes) {
		changes = append(changes, "indexes")
	}
	if !reflect.DeepEqual(previous.Partitioning, next.Partitioning) {
		changes = append(changes, "partitioning")
	}
	if !reflect.DeepEqual(previous.VolumeEstimate, next.VolumeEstimate) {
		changes = append(changes, "volumeEstimate")
	}
	if previous.AdditionalSQL != next.AdditionalSQL {
		changes = append(changes, "additionalSql")
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
