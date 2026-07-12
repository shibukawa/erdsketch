package collaboration

import (
	"errors"
	"testing"
)

func TestJoinAssignsDifferentAvailableAnimalNames(t *testing.T) {
	hub := NewHub()
	first := hub.JoinWithNameAssignment(Collaborator{ID: "first"}, true, nil, nil, nil)
	second := hub.JoinWithNameAssignment(Collaborator{ID: "second"}, true, nil, nil, nil)
	if first.User.Name == "" || second.User.Name == "" {
		t.Fatalf("assigned names must not be empty: first=%q second=%q", first.User.Name, second.User.Name)
	}
	if first.User.Name == second.User.Name {
		t.Fatalf("assigned names must differ: %q", first.User.Name)
	}
	custom := hub.JoinWithNameAssignment(Collaborator{ID: "custom", Name: "Architect"}, false, nil, nil, nil)
	if custom.User.Name != "Architect" {
		t.Fatalf("configured name changed: got %q", custom.User.Name)
	}
}

func TestNamingPolicyDefaultsToSingularAndSynchronizes(t *testing.T) {
	hub := NewHub()
	joined := hub.Join(Collaborator{ID: "lion", Name: "Lion"}, nil, nil, nil)
	if got := joined.State.NamingPolicy.TablePluralization; got != "singular" {
		t.Fatalf("default pluralization: got %q, want singular", got)
	}
	if _, err := hub.UpdateNamingPolicy("lion", NamingPolicy{TablePluralization: "plural"}); err != nil {
		t.Fatalf("update naming policy: %v", err)
	}
	if got := hub.snapshotLocked().NamingPolicy.TablePluralization; got != "plural" {
		t.Fatalf("updated pluralization: got %q, want plural", got)
	}
	if _, err := hub.UpdateNamingPolicy("lion", NamingPolicy{TablePluralization: "sometimes"}); !errors.Is(err, ErrNamingPolicyInvalid) {
		t.Fatalf("invalid naming policy: got %v, want %v", err, ErrNamingPolicyInvalid)
	}
}

func TestVocabularyNamesPersistOnSeedsFieldsAndDomains(t *testing.T) {
	hub := NewHub()
	domain := DataDomain{ID: "customer-id", Name: "Customer ID", Names: &NameSet{Business: "顧客番号", System: "顧客ID", Physical: "customer_id"}, Shape: "scalar", PrimitiveType: "varchar"}
	seed := ModelSeed{ID: "customer", Title: "Customer", Names: &NameSet{Business: "顧客", System: "顧客", Physical: "customer"}, Fields: []ModelField{{ID: "id", Name: "id", Names: &NameSet{Business: "顧客番号", System: "顧客ID", Physical: "customer_id"}}}}
	hub.Join(Collaborator{ID: "lion", Name: "Lion"}, []ModelSeed{seed}, nil, nil, []DataDomain{domain})
	state := hub.snapshotLocked()
	if state.Seeds[0].Names == nil || state.Seeds[0].Names.Physical != "customer" || state.Seeds[0].Fields[0].Names == nil || state.Seeds[0].Fields[0].Names.Business != "顧客番号" {
		t.Fatalf("seed vocabulary names: %+v", state.Seeds[0])
	}
	if state.Domains[0].Names == nil || state.Domains[0].Names.System != "顧客ID" {
		t.Fatalf("domain vocabulary names: %+v", state.Domains[0])
	}
}

func TestVocabularyEntriesAreProjectOwnedAndRejectDuplicateBusinessNames(t *testing.T) {
	hub := NewHub()
	hub.Join(Collaborator{ID: "lion", Name: "Lion"}, nil, nil, nil)
	entry := VocabularyEntry{ID: "shopping", BusinessName: "Shopping", SystemName: "Shopping", PhysicalName: "shopping"}
	if _, err := hub.UpdateVocabulary("lion", entry, true, false); err != nil {
		t.Fatalf("create vocabulary: %v", err)
	}
	duplicate := VocabularyEntry{ID: "shopping-duplicate", BusinessName: "shopping"}
	if _, err := hub.UpdateVocabulary("lion", duplicate, true, false); !errors.Is(err, ErrVocabularyExists) {
		t.Fatalf("duplicate vocabulary: got %v, want %v", err, ErrVocabularyExists)
	}
	entry.Meaning = "Purchasing activity"
	if _, err := hub.UpdateVocabulary("lion", entry, false, false); err != nil {
		t.Fatalf("update vocabulary: %v", err)
	}
	state := hub.snapshotLocked()
	if len(state.VocabularyEntries) != 1 || state.VocabularyEntries[0].Meaning != "Purchasing activity" {
		t.Fatalf("vocabulary state: %+v", state.VocabularyEntries)
	}
	if _, err := hub.UpdateVocabulary("lion", entry, false, true); err != nil {
		t.Fatalf("delete vocabulary: %v", err)
	}
	if got := len(hub.snapshotLocked().VocabularyEntries); got != 0 {
		t.Fatalf("vocabulary count after delete: %d", got)
	}
}

func TestVocabularyTermsUseFirstDefinitionAcrossBusinessNamesAndAliases(t *testing.T) {
	hub := NewHub()
	hub.Join(Collaborator{ID: "lion", Name: "Lion"}, nil, nil, nil)
	preferred := VocabularyEntry{ID: "item", BusinessName: "Item", Aliases: []string{"Product"}}
	if _, err := hub.UpdateVocabulary("lion", preferred, true, false); err != nil {
		t.Fatalf("create preferred vocabulary: %v", err)
	}
	for _, conflicting := range []VocabularyEntry{
		{ID: "product", BusinessName: "product"},
		{ID: "goods", BusinessName: "Goods", Aliases: []string{"ITEM"}},
		{ID: "stock", BusinessName: "Stock", Aliases: []string{" product "}},
	} {
		if _, err := hub.UpdateVocabulary("lion", conflicting, true, false); !errors.Is(err, ErrVocabularyExists) {
			t.Errorf("conflicting term %+v: got %v, want %v", conflicting, err, ErrVocabularyExists)
		}
	}
	preferred.Aliases = []string{"Item"}
	if _, err := hub.UpdateVocabulary("lion", preferred, false, false); !errors.Is(err, ErrVocabularyExists) {
		t.Fatalf("alias matching its own business name: got %v, want %v", err, ErrVocabularyExists)
	}
}

func TestVocabularyBindingPersistsOnModelNames(t *testing.T) {
	binding := &VocabularyBinding{SourceText: "Shopping Item", Manual: true, Segments: []VocabularySegment{{Type: "entry", EntryID: "shopping", Source: "Shopping"}, {Type: "entry", EntryID: "item", Source: "Item"}}}
	hub := NewHub()
	hub.Join(Collaborator{ID: "lion", Name: "Lion"}, []ModelSeed{{ID: "items", Title: "Shopping Item", VocabularyBinding: binding, Fields: []ModelField{{ID: "code", Name: "Item Code", VocabularyBinding: binding}}}}, nil, nil, []DataDomain{{ID: "item-code", Name: "Item Code", Shape: "scalar", VocabularyBinding: binding}})
	state := hub.snapshotLocked()
	if state.Seeds[0].VocabularyBinding == nil || !state.Seeds[0].VocabularyBinding.Manual || state.Seeds[0].Fields[0].VocabularyBinding == nil || state.Domains[0].VocabularyBinding == nil {
		t.Fatalf("bindings not preserved: %+v", state)
	}
}

func TestSeedUpdateRequiresOwningLock(t *testing.T) {
	hub := NewHub()
	hub.Join(Collaborator{ID: "lion", Name: "Lion"}, []ModelSeed{{ID: "order", Title: "Order"}}, nil, nil)

	_, err := hub.UpdateSeed("lion", ModelSeed{ID: "order", Title: "Changed"}, false)
	if !errors.Is(err, ErrLockRequired) {
		t.Fatalf("update without lock: got %v, want %v", err, ErrLockRequired)
	}
	if _, err := hub.ChangeLock("lion", "order", "lock"); err != nil {
		t.Fatalf("lock: %v", err)
	}
	if _, err := hub.UpdateSeed("lion", ModelSeed{ID: "order", Title: "Changed"}, false); err != nil {
		t.Fatalf("update with lock: %v", err)
	}

	subscription := hub.Subscribe("lion")
	defer subscription.Close()
	if got := subscription.Initial().Seeds[0].Title; got != "Changed" {
		t.Fatalf("title: got %q, want Changed", got)
	}
}

func TestSeedUpdateSynchronizesFields(t *testing.T) {
	hub := NewHub()
	hub.Join(Collaborator{ID: "lion", Name: "Lion"}, []ModelSeed{{ID: "order", Title: "Order"}}, nil, nil)
	if _, err := hub.ChangeLock("lion", "order", "lock"); err != nil {
		t.Fatalf("lock: %v", err)
	}

	fields := []ModelField{{ID: "order-id", Name: "id", PrimaryKey: true}, {ID: "number", Name: "order_number", Important: true}}
	result, err := hub.UpdateSeed("lion", ModelSeed{ID: "order", Title: "Order", Fields: fields}, false)
	if err != nil {
		t.Fatalf("update fields: %v", err)
	}
	if len(result.Changes) != 1 || result.Changes[0] != "fields" {
		t.Fatalf("changes: got %v, want [fields]", result.Changes)
	}

	subscription := hub.Subscribe("lion")
	defer subscription.Close()
	got := subscription.Initial().Seeds[0].Fields
	if !got[0].PrimaryKey || !got[1].Important || got[1].Name != "order_number" {
		t.Fatalf("fields: got %+v", got)
	}
}

func TestApplyRefinementIsAtomicAndRequiresChangedModelLock(t *testing.T) {
	hub := NewHub()
	initial := []ModelSeed{{ID: "order", Title: "Order", Fields: []ModelField{{ID: "number", Name: "number"}}}}
	hub.Join(Collaborator{ID: "lion", Name: "Lion"}, initial, nil, nil)
	next := []ModelSeed{{ID: "order", Title: "Order", Fields: nil}, {ID: "detail", Title: "Order Detail", Fields: []ModelField{{ID: "number", Name: "number"}}}}
	relationships := []Relationship{{ID: "details", Name: "contains", SourceID: "order", TargetID: "detail", SourceMultiplicity: "1", TargetMultiplicity: "0..*", Direction: "source-to-target", Kind: "foreign-key"}}
	references := []RelationshipReference{{ID: "details-ref", RelationshipID: "details", ForeignKey: true}}
	if _, err := hub.ApplyRefinement("lion", next, relationships, references, nil, []string{"extract detail"}); !errors.Is(err, ErrLockRequired) {
		t.Fatalf("apply without lock: got %v, want %v", err, ErrLockRequired)
	}
	before := hub.Subscribe("lion")
	if got := before.Initial(); len(got.Seeds) != 1 || len(got.Relationships) != 0 || len(got.Seeds[0].Fields) != 1 {
		t.Fatalf("failed refinement changed state: %+v", got)
	}
	before.Close()
	hub.Join(Collaborator{ID: "lion", Name: "Lion"}, nil, nil, nil)
	if _, err := hub.ChangeLock("lion", "order", "lock"); err != nil {
		t.Fatalf("lock: %v", err)
	}
	if _, err := hub.ApplyRefinement("lion", next, relationships, references, nil, []string{"extract detail"}); err != nil {
		t.Fatalf("apply: %v", err)
	}
	after := hub.Subscribe("lion")
	defer after.Close()
	if got := after.Initial(); len(got.Seeds) != 2 || len(got.Relationships) != 1 || len(got.Seeds[0].Fields) != 0 {
		t.Fatalf("refinement state: %+v", got)
	}
}

func TestSeedUpdateSynchronizesMaturedLevel(t *testing.T) {
	hub := NewHub()
	hub.Join(Collaborator{ID: "lion", Name: "Lion"}, []ModelSeed{{ID: "order", MaturedLevel: 6}}, nil, nil)
	if _, err := hub.ChangeLock("lion", "order", "lock"); err != nil {
		t.Fatalf("lock: %v", err)
	}

	result, err := hub.UpdateSeed("lion", ModelSeed{ID: "order", MaturedLevel: 1.25}, false)
	if err != nil {
		t.Fatalf("update matured level: %v", err)
	}
	if len(result.Changes) != 1 || result.Changes[0] != "maturedLevel" {
		t.Fatalf("changes: got %v, want [maturedLevel]", result.Changes)
	}

	subscription := hub.Subscribe("lion")
	defer subscription.Close()
	if got := subscription.Initial().Seeds[0].MaturedLevel; got != 1.25 {
		t.Fatalf("matured level: got %v, want 1.25", got)
	}
}

func TestLockRejectsAnotherCollaborator(t *testing.T) {
	hub := NewHub()
	hub.Join(Collaborator{ID: "lion", Name: "Lion"}, nil, nil, nil)
	hub.Join(Collaborator{ID: "koara", Name: "Koara"}, nil, nil, nil)

	if _, err := hub.ChangeLock("lion", "order", "lock"); err != nil {
		t.Fatalf("first lock: %v", err)
	}
	result, err := hub.ChangeLock("koara", "order", "lock")
	if !errors.Is(err, ErrLockConflict) {
		t.Fatalf("second lock: got %v, want %v", err, ErrLockConflict)
	}
	if result.Owner.ID != "lion" {
		t.Fatalf("lock owner: got %q, want lion", result.Owner.ID)
	}
}

func TestClosingSubscriptionRemovesUserAndOwnedLocks(t *testing.T) {
	hub := NewHub()
	hub.Join(Collaborator{ID: "lion", Name: "Lion"}, nil, nil, nil)
	if _, err := hub.ChangeLock("lion", "order", "lock"); err != nil {
		t.Fatalf("lock: %v", err)
	}

	subscription := hub.Subscribe("lion")
	departure := subscription.Close()
	if departure.User.ID != "lion" || departure.ReleasedLocks != 1 {
		t.Fatalf("departure: got %+v", departure)
	}
	if _, err := hub.UpdateUser("lion", nil, nil, nil); !errors.Is(err, ErrUnknownClient) {
		t.Fatalf("update after close: got %v, want %v", err, ErrUnknownClient)
	}
}

func TestRelationshipUpdateRequiresBothEndpointLocksAndPersistsReference(t *testing.T) {
	hub := NewHub()
	seeds := []ModelSeed{{ID: "order", Title: "Order"}, {ID: "line", Title: "Line"}}
	hub.Join(Collaborator{ID: "lion", Name: "Lion"}, seeds, nil, nil)
	relationship := Relationship{ID: "order-lines", Name: "contains", SourceID: "order", TargetID: "line", SourceMultiplicity: "1", TargetMultiplicity: "1..*", Direction: "source-to-target"}
	reference := RelationshipReference{ID: "order-lines-reference", RelationshipID: relationship.ID, ForeignKey: true}

	if _, err := hub.ChangeLocks("lion", []string{"order"}, "lock"); err != nil {
		t.Fatalf("lock source: %v", err)
	}
	if _, err := hub.UpdateRelationship("lion", relationship, reference, true, false); !errors.Is(err, ErrLockRequired) {
		t.Fatalf("create with one lock: got %v, want %v", err, ErrLockRequired)
	}
	if _, err := hub.ChangeLocks("lion", []string{"order", "line"}, "lock"); err != nil {
		t.Fatalf("lock endpoints: %v", err)
	}
	if _, err := hub.UpdateRelationship("lion", relationship, reference, true, false); err != nil {
		t.Fatalf("create relationship: %v", err)
	}

	subscription := hub.Subscribe("lion")
	defer subscription.Close()
	state := subscription.Initial()
	if len(state.Relationships) != 1 || len(state.RelationshipReferences) != 1 || !state.RelationshipReferences[0].ForeignKey {
		t.Fatalf("relationship state: %+v", state)
	}
}

func TestRelationshipKindAndVisibilityPersist(t *testing.T) {
	hub := NewHub()
	seeds := []ModelSeed{{ID: "order", Title: "Order"}, {ID: "history", Title: "OrderHistory"}}
	hub.Join(Collaborator{ID: "lion", Name: "Lion"}, seeds, nil, nil)
	if _, err := hub.ChangeLocks("lion", []string{"order", "history"}, "lock"); err != nil {
		t.Fatalf("lock endpoints: %v", err)
	}
	relationship := Relationship{
		ID: "order-history", Name: "derived history", SourceID: "history", TargetID: "order",
		SourceMultiplicity: "1", TargetMultiplicity: "1", Direction: "source-to-target",
		Kind: "label",
	}
	reference := RelationshipReference{
		ID: "order-history-reference", RelationshipID: relationship.ID,
		HiddenOnModelIDs: []string{"history"},
	}
	if _, err := hub.UpdateRelationship("lion", relationship, reference, true, false); err != nil {
		t.Fatalf("create label relationship: %v", err)
	}

	state := hub.snapshotLocked()
	if got := state.Relationships[0]; got.Kind != "label" {
		t.Fatalf("relationship metadata: %+v", got)
	}
	if got := state.RelationshipReferences[0].HiddenOnModelIDs; len(got) != 1 || got[0] != "history" {
		t.Fatalf("hidden projections: %v", got)
	}
}

func TestRelationshipUpdateRejectsInvalidKindAndVisibilityModel(t *testing.T) {
	hub := NewHub()
	seeds := []ModelSeed{{ID: "child"}, {ID: "parent"}, {ID: "other"}}
	hub.Join(Collaborator{ID: "lion", Name: "Lion"}, seeds, nil, nil)
	if _, err := hub.ChangeLocks("lion", []string{"child", "parent"}, "lock"); err != nil {
		t.Fatalf("lock endpoints: %v", err)
	}
	base := Relationship{ID: "inherit", Name: "inherits", SourceID: "child", TargetID: "parent", SourceMultiplicity: "1", TargetMultiplicity: "1", Direction: "source-to-target"}
	reference := RelationshipReference{ID: "inherit-reference", RelationshipID: base.ID}

	invalidKind := base
	invalidKind.Kind = "snapshot"
	if _, err := hub.UpdateRelationship("lion", invalidKind, reference, true, false); !errors.Is(err, ErrRelationshipInvalid) {
		t.Fatalf("invalid kind: got %v, want %v", err, ErrRelationshipInvalid)
	}
	base.Kind = "inherit"
	reference.HiddenOnModelIDs = []string{"other"}
	if _, err := hub.UpdateRelationship("lion", base, reference, true, false); !errors.Is(err, ErrRelationshipInvalid) {
		t.Fatalf("invalid hidden model: got %v, want %v", err, ErrRelationshipInvalid)
	}
}

func TestChangeLocksIsAtomic(t *testing.T) {
	hub := NewHub()
	hub.Join(Collaborator{ID: "lion", Name: "Lion"}, nil, nil, nil)
	hub.Join(Collaborator{ID: "fox", Name: "Fox"}, nil, nil, nil)
	if _, err := hub.ChangeLocks("fox", []string{"line"}, "lock"); err != nil {
		t.Fatalf("lock line: %v", err)
	}
	if _, err := hub.ChangeLocks("lion", []string{"order", "line"}, "lock"); !errors.Is(err, ErrLockConflict) {
		t.Fatalf("lock conflict: got %v, want %v", err, ErrLockConflict)
	}
	state := hub.snapshotLocked()
	if _, exists := state.Locks["order"]; exists {
		t.Fatalf("order lock must not be partially acquired: %+v", state.Locks)
	}
}

func TestRelationshipUpdateRejectsMissingEndpoint(t *testing.T) {
	hub := NewHub()
	hub.Join(Collaborator{ID: "lion", Name: "Lion"}, []ModelSeed{{ID: "order"}}, nil, nil)
	if _, err := hub.ChangeLocks("lion", []string{"order", "missing"}, "lock"); err != nil {
		t.Fatalf("lock: %v", err)
	}
	relationship := Relationship{ID: "invalid", Name: "invalid", SourceID: "order", TargetID: "missing", SourceMultiplicity: "1", TargetMultiplicity: "0..*", Direction: "source-to-target"}
	_, err := hub.UpdateRelationship("lion", relationship, RelationshipReference{ID: "invalid-reference", RelationshipID: "invalid"}, true, false)
	if !errors.Is(err, ErrRelationshipInvalid) {
		t.Fatalf("missing endpoint: got %v, want %v", err, ErrRelationshipInvalid)
	}
}

func TestDomainDictionarySynchronizesAssignmentsAndProtectsReferences(t *testing.T) {
	hub := NewHub()
	userIDDomain := DataDomain{ID: "user-id", Name: "User ID", Shape: "scalar", PrimitiveType: "varchar", Length: 6}
	integerDomain := DataDomain{ID: "primitive-integer", Name: "Integer", CategoryID: "primitive", Shape: "primitive", PrimitiveType: "integer", Bits: 32, System: true}
	hub.Join(Collaborator{ID: "lion", Name: "Lion"}, []ModelSeed{{ID: "customer", Title: "Customer"}}, nil, nil, []DataDomain{userIDDomain, integerDomain})

	if _, err := hub.ChangeLock("lion", "customer", "lock"); err != nil {
		t.Fatalf("lock: %v", err)
	}
	if _, err := hub.UpdateSeed("lion", ModelSeed{ID: "customer", Title: "Customer", Fields: []ModelField{{ID: "customer-user-id", Name: "user_id", DomainID: "user-id"}}}, false); err != nil {
		t.Fatalf("assign domain: %v", err)
	}
	if _, err := hub.UpdateDomain("lion", userIDDomain, false, true); !errors.Is(err, ErrDomainInUse) {
		t.Fatalf("delete assigned domain: got %v, want %v", err, ErrDomainInUse)
	}

	tenantIDDomain := DataDomain{ID: "tenant-id", Name: "Tenant ID", Shape: "scalar", PrimitiveType: "uuid"}
	if _, err := hub.UpdateDomain("lion", tenantIDDomain, true, false); err != nil {
		t.Fatalf("create scalar domain: %v", err)
	}
	customerCode := DataDomain{
		ID: "customer-code", Name: "Customer Code", Shape: "composite",
		Components: []DomainComponent{
			{ID: "serial", Name: "Serial", Required: true, Description: "Type decided later"},
			{ID: "year", Name: "Year", DomainID: "primitive-integer", Required: true, Description: "Manufacturing year"},
			{ID: "tenant", Name: "Tenant ID", DomainID: "tenant-id", Required: false, Description: "Owning tenant"},
			{ID: "user", Name: "User ID", DomainID: "user-id", Required: true},
		},
	}
	if _, err := hub.UpdateDomain("lion", customerCode, true, false); err != nil {
		t.Fatalf("create composite domain: %v", err)
	}
	nested := DataDomain{ID: "nested-code", Name: "Nested Code", Shape: "composite", Components: []DomainComponent{{ID: "customer", Name: "Customer", DomainID: customerCode.ID}}}
	if _, err := hub.UpdateDomain("lion", nested, true, false); !errors.Is(err, ErrDomainInvalid) {
		t.Fatalf("nested composite: got %v, want %v", err, ErrDomainInvalid)
	}
	if _, err := hub.UpdateDomain("lion", tenantIDDomain, false, true); !errors.Is(err, ErrDomainInUse) {
		t.Fatalf("delete component domain: got %v, want %v", err, ErrDomainInUse)
	}

	subscription := hub.Subscribe("lion")
	defer subscription.Close()
	state := subscription.Initial()
	components := state.Domains[3].Components
	if len(state.Domains) != 4 || state.Seeds[0].Fields[0].DomainID != "user-id" || len(components) != 4 || components[0].DomainID != "" || components[0].Description != "Type decided later" || components[1].DomainID != "primitive-integer" || components[1].Description != "Manufacturing year" || components[2].Required {
		t.Fatalf("domain state: %+v", state)
	}
}

func TestSeedUpdateRejectsUnknownDomain(t *testing.T) {
	hub := NewHub()
	hub.Join(Collaborator{ID: "lion", Name: "Lion"}, []ModelSeed{{ID: "order", Title: "Order"}}, nil, nil)
	if _, err := hub.ChangeLock("lion", "order", "lock"); err != nil {
		t.Fatalf("lock: %v", err)
	}
	_, err := hub.UpdateSeed("lion", ModelSeed{ID: "order", Title: "Order", Fields: []ModelField{{ID: "id", Name: "id", DomainID: "missing"}}}, false)
	if !errors.Is(err, ErrDomainNotFound) {
		t.Fatalf("unknown field domain: got %v, want %v", err, ErrDomainNotFound)
	}
}

func TestDomainNamingAndPartitionKeyMetadataSynchronize(t *testing.T) {
	hub := NewHub()
	domain := DataDomain{
		ID: "created-at", Name: "CreatedAt", Shape: "scalar", PrimitiveType: "datetime", PartitionKey: true,
	}
	composite := DataDomain{
		ID: "tenant-code", Name: "TenantCode", Shape: "composite",
		Components: []DomainComponent{{ID: "tenant", Name: "Tenant", DomainID: domain.ID, PartitionKey: true}},
	}
	hub.Join(Collaborator{ID: "lion", Name: "Lion"}, []ModelSeed{{ID: "article", Title: "Article"}}, nil, nil, []DataDomain{domain, composite})
	if _, err := hub.ChangeLock("lion", "article", "lock"); err != nil {
		t.Fatalf("lock: %v", err)
	}
	fields := []ModelField{
		{ID: "created", Name: "Article", DomainID: domain.ID, UseDomainName: true},
		{ID: "domain-only", Name: "", DomainID: domain.ID, UseDomainName: true},
	}
	if _, err := hub.UpdateSeed("lion", ModelSeed{ID: "article", Title: "Article", Fields: fields}, false); err != nil {
		t.Fatalf("save domain-named fields: %v", err)
	}
	state := hub.snapshotLocked()
	if !state.Seeds[0].Fields[0].UseDomainName || !state.Domains[0].PartitionKey || !state.Domains[1].Components[0].PartitionKey {
		t.Fatalf("metadata was not preserved: %+v", state)
	}
	invalidFields := []ModelField{{ID: "empty", Name: "", DomainID: domain.ID}}
	if _, err := hub.UpdateSeed("lion", ModelSeed{ID: "article", Title: "Article", Fields: invalidFields}, false); !errors.Is(err, ErrDomainNotFound) {
		t.Fatalf("empty field without domain-name use: got %v, want %v", err, ErrDomainNotFound)
	}
	invalidFields = []ModelField{{ID: "orphan", Name: "Article", UseDomainName: true}}
	if _, err := hub.UpdateSeed("lion", ModelSeed{ID: "article", Title: "Article", Fields: invalidFields}, false); !errors.Is(err, ErrDomainNotFound) {
		t.Fatalf("domain-name use without domain: got %v, want %v", err, ErrDomainNotFound)
	}
}

func TestEveryDomainShapeCanBeAssigned(t *testing.T) {
	hub := NewHub()
	unresolved := DataDomain{ID: "customer-code", Name: "Customer Code", Shape: "unresolved"}
	hub.Join(Collaborator{ID: "lion", Name: "Lion"}, []ModelSeed{{ID: "customer", Title: "Customer"}}, nil, nil, []DataDomain{unresolved})
	if _, err := hub.ChangeLock("lion", "customer", "lock"); err != nil {
		t.Fatalf("lock: %v", err)
	}
	field := ModelField{ID: "customer-code", Name: "customer_code", DomainID: unresolved.ID}
	if _, err := hub.UpdateSeed("lion", ModelSeed{ID: "customer", Title: "Customer", Fields: []ModelField{field}}, false); err != nil {
		t.Fatalf("assign unresolved: %v", err)
	}

	emptyComposite := DataDomain{ID: unresolved.ID, Name: unresolved.Name, Shape: "composite"}
	if _, err := hub.UpdateDomain("lion", emptyComposite, false, false); err != nil {
		t.Fatalf("make assigned domain empty composite: %v", err)
	}

	unassignedComposite := DataDomain{ID: "empty-code", Name: "Empty Code", Shape: "composite"}
	if _, err := hub.UpdateDomain("lion", unassignedComposite, true, false); err != nil {
		t.Fatalf("create empty composite: %v", err)
	}
	field.DomainID = unassignedComposite.ID
	if _, err := hub.UpdateSeed("lion", ModelSeed{ID: "customer", Title: "Customer", Fields: []ModelField{field}}, false); err != nil {
		t.Fatalf("assign empty composite: %v", err)
	}

	scalar := DataDomain{ID: "country-code", Name: "Country Code", Shape: "scalar", PrimitiveType: "varchar", Length: 2}
	if _, err := hub.UpdateDomain("lion", scalar, true, false); err != nil {
		t.Fatalf("create scalar: %v", err)
	}
	composite := DataDomain{
		ID: "product-code", Name: "Product Code", Shape: "composite",
		Components: []DomainComponent{{ID: "country", Name: "Country", DomainID: scalar.ID, Required: true}},
	}
	if _, err := hub.UpdateDomain("lion", composite, true, false); err != nil {
		t.Fatalf("create populated composite: %v", err)
	}
	fields := []ModelField{
		field,
		{ID: "country", Name: "country", DomainID: scalar.ID},
		{ID: "product", Name: "product", DomainID: composite.ID},
	}
	if _, err := hub.UpdateSeed("lion", ModelSeed{ID: "customer", Title: "Customer", Fields: fields}, false); err != nil {
		t.Fatalf("assign scalar and populated composite: %v", err)
	}
}

func TestCodeSetDomainValidatesAndPreservesOrderedEntries(t *testing.T) {
	hub := NewHub()
	hub.Join(Collaborator{ID: "lion", Name: "Lion"}, nil, nil, nil)
	domain := DataDomain{
		ID: "order-status", Name: "Order Status", Shape: "scalar", PrimitiveType: "code_set", CodeSetBaseType: "integer",
		CodeSetEntries: []CodeSetEntry{{ID: "paid", Name: "Paid", Value: "20"}, {ID: "pending", Name: "Pending", Value: "10"}},
	}
	if _, err := hub.UpdateDomain("lion", domain, true, false); err != nil {
		t.Fatalf("create code set: %v", err)
	}
	state := hub.snapshotLocked()
	if got := state.Domains[0]; got.PrimitiveType != "code_set" || got.CodeSetBaseType != "integer" || len(got.CodeSetEntries) != 2 || got.CodeSetEntries[0].Name != "Paid" || got.CodeSetEntries[1].Value != "10" {
		t.Fatalf("code set was not preserved in order: %+v", got)
	}

	invalidValue := domain
	invalidValue.ID = "bad-value"
	invalidValue.Name = "Bad Value"
	invalidValue.CodeSetEntries = []CodeSetEntry{{ID: "bad", Name: "Bad", Value: "1.5"}}
	if _, err := hub.UpdateDomain("lion", invalidValue, true, false); !errors.Is(err, ErrDomainInvalid) {
		t.Fatalf("decimal value in integer code set: got %v, want %v", err, ErrDomainInvalid)
	}

	invalidBase := domain
	invalidBase.ID = "bad-base"
	invalidBase.Name = "Bad Base"
	invalidBase.CodeSetBaseType = "boolean"
	if _, err := hub.UpdateDomain("lion", invalidBase, true, false); !errors.Is(err, ErrDomainInvalid) {
		t.Fatalf("unsupported code set base: got %v, want %v", err, ErrDomainInvalid)
	}
}

func TestDomainCategoriesStartWithUserDefinedAndCanBeRenamed(t *testing.T) {
	hub := NewHub()
	hub.Join(Collaborator{ID: "lion", Name: "Lion"}, nil, nil, nil)

	initial := hub.snapshotLocked().DomainCategories
	if len(initial) != 2 || initial[0].Name != "Primitive" || initial[1].Name != "User Defined" {
		t.Fatalf("initial categories: %+v", initial)
	}
	category := DomainCategory{ID: "billing", Name: "Billing"}
	if _, err := hub.UpdateCategory("lion", category, true); err != nil {
		t.Fatalf("create category: %v", err)
	}
	category.Name = "Reference data"
	if _, err := hub.UpdateCategory("lion", category, false); err != nil {
		t.Fatalf("rename category: %v", err)
	}
	domain := DataDomain{ID: "payment-code", Name: "Payment Code", CategoryID: category.ID, Shape: "unresolved"}
	if _, err := hub.UpdateDomain("lion", domain, true, false); err != nil {
		t.Fatalf("create categorized domain: %v", err)
	}
	state := hub.snapshotLocked()
	if state.Domains[0].CategoryID != "billing" || state.DomainCategories[2].Name != "Reference data" {
		t.Fatalf("category state: %+v", state)
	}
}
