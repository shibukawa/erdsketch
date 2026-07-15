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

func TestSeedUpdatePersistsPhysicalDesignAndCapacity(t *testing.T) {
	hub := NewHub()
	hub.Join(Collaborator{ID: "lion", Name: "Lion"}, []ModelSeed{{ID: "events", Title: "Events"}}, nil, nil, []DataDomain{{ID: "integer", Shape: "primitive", PrimitiveType: "integer"}})
	if _, err := hub.ChangeLock("lion", "events", "lock"); err != nil {
		t.Fatalf("lock: %v", err)
	}
	averageSize := 1024.0
	maximumCount := 9_000_000.0
	next := ModelSeed{
		ID: "events", Title: "Events", Role: "transaction",
		Fields:         []ModelField{{ID: "id", Name: "id", DomainID: "integer", PrimaryKey: true, Required: true, ValueGeneration: "auto_increment"}, {ID: "payload", Name: "payload", Required: true, AverageSizeBytes: &averageSize, DefaultValue: &ColumnDefault{Kind: "literal", Value: "{}"}}},
		Indexes:        []IndexDefinition{{ID: "event-time", Name: "idx_events_time", Keys: []IndexKey{{Source: "field", SourceID: "payload", Direction: "descending"}}}},
		Partitioning:   &PartitionScheme{Strategy: "range", Keys: []PartitionKey{{FieldID: "payload"}}, Ranges: []PartitionRange{{ID: "january", Name: "p_january", From: []PartitionBound{{Kind: "literal", Value: "2026-01-01"}}, To: []PartitionBound{{Kind: "literal", Value: "2026-02-01"}}}}},
		VolumeEstimate: &VolumeEstimate{InitialRecordCount: 1000, GrowthRate: GrowthRate{Amount: 500, Period: "hour"}, RetentionPeriod: &RetentionPeriod{Value: 2, Unit: "month"}, MaximumRecordCount: &maximumCount},
		AdditionalSQL:  "ALTER TABLE events SET (...);",
	}
	result, err := hub.UpdateSeed("lion", next, false)
	if err != nil {
		t.Fatalf("update physical design: %v", err)
	}
	for _, want := range []string{"fields", "role", "indexes", "partitioning", "volumeEstimate", "additionalSql"} {
		found := false
		for _, got := range result.Changes {
			found = found || got == want
		}
		if !found {
			t.Fatalf("changes %v do not include %q", result.Changes, want)
		}
	}
	state := hub.Subscribe("lion")
	defer state.Close()
	got := state.Initial().Seeds[0]
	if got.Fields[1].AverageSizeBytes == nil || *got.Fields[1].AverageSizeBytes != averageSize || got.Fields[1].DefaultValue.Value != "{}" || got.Indexes[0].Keys[0].Direction != "descending" || got.Partitioning.Ranges[0].Name != "p_january" || got.VolumeEstimate.RetentionPeriod.Unit != "month" || got.AdditionalSQL == "" {
		t.Fatalf("physical design was not preserved: %+v", got)
	}
}

func TestTransactionRetentionDefaultsPerModelAndCannotBeUnlimited(t *testing.T) {
	hub := NewHub()
	hub.Join(Collaborator{ID: "lion", Name: "Lion"}, []ModelSeed{{ID: "orders", Title: "Orders", Role: "transaction"}}, nil, nil)
	state := hub.Subscribe("lion")
	defer state.Close()
	got := state.Initial().Seeds[0].VolumeEstimate
	if got == nil || got.RetentionPeriod == nil || got.RetentionPeriod.Value != 3 || got.RetentionPeriod.Unit != "year" {
		t.Fatalf("default transaction retention: %+v", got)
	}
	if _, err := hub.ChangeLock("lion", "orders", "lock"); err != nil {
		t.Fatalf("lock: %v", err)
	}
	next := ModelSeed{ID: "orders", Title: "Orders", Role: "transaction", VolumeEstimate: &VolumeEstimate{GrowthRate: GrowthRate{Period: "day"}}}
	if _, err := hub.UpdateSeed("lion", next, false); err != nil {
		t.Fatalf("normalize missing retention: %v", err)
	}
	retention := hub.snapshotLocked().Seeds[0].VolumeEstimate.RetentionPeriod
	if retention == nil || retention.Value != 3 || retention.Unit != "year" {
		t.Fatalf("normalized transaction retention: %+v", retention)
	}
}

func TestAutoIncrementRequiresIntegerPrimaryKey(t *testing.T) {
	domains := []DataDomain{{ID: "integer", Shape: "primitive", PrimitiveType: "integer"}, {ID: "text", Shape: "primitive", PrimitiveType: "text"}}
	hub := NewHub()
	hub.Join(Collaborator{ID: "lion", Name: "Lion"}, []ModelSeed{{ID: "orders", Title: "Orders"}}, nil, nil, domains)
	if _, err := hub.ChangeLock("lion", "orders", "lock"); err != nil {
		t.Fatalf("lock: %v", err)
	}
	for _, field := range []ModelField{
		{ID: "id", Name: "id", DomainID: "text", PrimaryKey: true, ValueGeneration: "auto_increment"},
		{ID: "id", Name: "id", DomainID: "integer", ValueGeneration: "auto_increment"},
	} {
		if _, err := hub.UpdateSeed("lion", ModelSeed{ID: "orders", Title: "Orders", Fields: []ModelField{field}}, false); !errors.Is(err, ErrSeedInvalid) {
			t.Fatalf("invalid auto increment %+v: got %v, want %v", field, err, ErrSeedInvalid)
		}
	}
	valid := ModelField{ID: "id", Name: "id", DomainID: "integer", PrimaryKey: true, Required: true, ValueGeneration: "auto_increment"}
	if _, err := hub.UpdateSeed("lion", ModelSeed{ID: "orders", Title: "Orders", Fields: []ModelField{valid}}, false); err != nil {
		t.Fatalf("valid auto increment: %v", err)
	}
	valid.ValueGeneration = "none"
	if _, err := hub.UpdateSeed("lion", ModelSeed{ID: "orders", Title: "Orders", Fields: []ModelField{valid}}, false); err != nil {
		t.Fatalf("clear auto increment: %v", err)
	}
	if got := hub.snapshotLocked().Seeds[0].Fields[0].ValueGeneration; got != "" {
		t.Fatalf("cleared value generation: got %q", got)
	}
}

func TestInvalidIndexAndPartitionDefinitionsAreRejected(t *testing.T) {
	hub := NewHub()
	hub.Join(Collaborator{ID: "lion", Name: "Lion"}, []ModelSeed{{ID: "orders", Title: "Orders", Fields: []ModelField{{ID: "id", Name: "id"}}}}, nil, nil)
	if _, err := hub.ChangeLock("lion", "orders", "lock"); err != nil {
		t.Fatalf("lock: %v", err)
	}
	invalidIndex := ModelSeed{ID: "orders", Title: "Orders", Fields: []ModelField{{ID: "id", Name: "id"}}, Indexes: []IndexDefinition{{ID: "empty", Name: "idx_empty"}}}
	if _, err := hub.UpdateSeed("lion", invalidIndex, false); !errors.Is(err, ErrSeedInvalid) {
		t.Fatalf("empty index: got %v, want %v", err, ErrSeedInvalid)
	}
	invalidPartition := ModelSeed{
		ID: "orders", Title: "Orders", Fields: []ModelField{{ID: "id", Name: "id"}},
		Partitioning: &PartitionScheme{Strategy: "range", Keys: []PartitionKey{{FieldID: "id"}}, Ranges: []PartitionRange{{ID: "p1", Name: "p1", From: []PartitionBound{{Kind: "literal"}}, To: []PartitionBound{{Kind: "maxvalue"}}}}},
	}
	if _, err := hub.UpdateSeed("lion", invalidPartition, false); !errors.Is(err, ErrSeedInvalid) {
		t.Fatalf("empty partition bound: got %v, want %v", err, ErrSeedInvalid)
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

func TestInitialSeedsBecomeOwnerPlacementsOnMainCanvas(t *testing.T) {
	hub := NewHub()
	joined := hub.Join(Collaborator{ID: "lion", Name: "Lion"}, []ModelSeed{{ID: "order", X: 120, Y: 80}, {ID: "customer", X: 420, Y: 90}}, nil, nil)
	if len(joined.State.Canvases) != 1 || joined.State.Canvases[0].ID != DefaultCanvasID {
		t.Fatalf("default canvases: %+v", joined.State.Canvases)
	}
	if len(joined.State.Placements) != 2 {
		t.Fatalf("placements: %+v", joined.State.Placements)
	}
	for _, placement := range joined.State.Placements {
		if placement.CanvasID != DefaultCanvasID || placement.AccessMode != "owner" {
			t.Fatalf("initial placement: %+v", placement)
		}
	}
}

func TestReadonlyPlacementAllowsLocalMoveButRejectsModelEdit(t *testing.T) {
	hub := NewHub()
	hub.Join(Collaborator{ID: "lion", Name: "Lion"}, []ModelSeed{{ID: "order", Title: "Order", X: 10, Y: 20}}, nil, nil)
	if _, err := hub.UpdateCanvas("lion", Canvas{ID: "billing", Name: "Billing"}, true); err != nil {
		t.Fatalf("create canvas: %v", err)
	}
	placement, err := hub.UpdatePlacement("lion", CanvasModelPlacement{CanvasID: "billing", SeedID: "order", X: 90, Y: 100}, true)
	if err != nil || placement.Placement.AccessMode != "readonly" {
		t.Fatalf("create readonly placement: result=%+v err=%v", placement, err)
	}
	updated, err := hub.UpdatePlacement("lion", CanvasModelPlacement{CanvasID: "billing", SeedID: "order", X: 140, Y: 160, AccessMode: "owner"}, false)
	if err != nil || updated.Placement.X != 140 || updated.Placement.AccessMode != "readonly" {
		t.Fatalf("move readonly placement: result=%+v err=%v", updated, err)
	}
	billing := "billing"
	if _, err := hub.UpdateUser("lion", nil, nil, nil, &billing); err != nil {
		t.Fatalf("switch canvas: %v", err)
	}
	if _, err := hub.ChangeLock("lion", "order", "lock"); err != nil {
		t.Fatalf("lock model: %v", err)
	}
	if _, err := hub.UpdateSeedInCanvas("lion", "billing", ModelSeed{ID: "order", Title: "Changed"}, false); !errors.Is(err, ErrReadonlyPlacement) {
		t.Fatalf("readonly edit: got %v, want %v", err, ErrReadonlyPlacement)
	}
}

func TestOwnershipTransferIsAtomicAndDetectsStaleOwner(t *testing.T) {
	hub := NewHub()
	hub.Join(Collaborator{ID: "lion", Name: "Lion"}, []ModelSeed{{ID: "order", Title: "Order", X: 10, Y: 20}}, nil, nil)
	if _, err := hub.UpdateCanvas("lion", Canvas{ID: "billing", Name: "Billing"}, true); err != nil {
		t.Fatalf("create canvas: %v", err)
	}
	if _, err := hub.ChangeLock("lion", "order", "lock"); err != nil {
		t.Fatalf("lock before transfer: %v", err)
	}
	result, err := hub.TransferOwnership("lion", "order", DefaultCanvasID, "billing")
	if err != nil || result.PreviousOwnerID != DefaultCanvasID || result.TargetOwnerID != "billing" {
		t.Fatalf("transfer: result=%+v err=%v", result, err)
	}
	state := hub.snapshotLocked()
	if _, locked := state.Locks["order"]; locked {
		t.Fatalf("ownership transfer must release the model lock: %+v", state.Locks)
	}
	ownerCount := 0
	for _, placement := range state.Placements {
		if placement.SeedID != "order" {
			continue
		}
		if placement.AccessMode == "owner" {
			ownerCount++
			if placement.CanvasID != "billing" {
				t.Fatalf("unexpected owner placement: %+v", placement)
			}
		}
		if placement.CanvasID == DefaultCanvasID && placement.AccessMode != "readonly" {
			t.Fatalf("previous owner must be readonly: %+v", placement)
		}
	}
	if ownerCount != 1 {
		t.Fatalf("owner count: got %d placements=%+v", ownerCount, state.Placements)
	}
	if _, err := hub.TransferOwnership("lion", "order", DefaultCanvasID, "billing"); !errors.Is(err, ErrOwnershipChanged) {
		t.Fatalf("stale transfer: got %v, want %v", err, ErrOwnershipChanged)
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

func TestRelationshipReferentialActionValidationAndPersistence(t *testing.T) {
	hub := NewHub()
	seeds := []ModelSeed{{ID: "customer", Title: "Customer"}, {ID: "order", Title: "Order"}}
	hub.Join(Collaborator{ID: "lion", Name: "Lion"}, seeds, nil, nil)
	if _, err := hub.ChangeLocks("lion", []string{"customer", "order"}, "lock"); err != nil {
		t.Fatalf("lock endpoints: %v", err)
	}
	reference := RelationshipReference{ID: "orders-reference", RelationshipID: "orders", ForeignKey: true}
	base := Relationship{ID: "orders", Name: "places", SourceID: "customer", TargetID: "order", SourceMultiplicity: "1", TargetMultiplicity: "0..*", Direction: "source-to-target", Kind: "foreign-key"}
	invalid := base
	invalid.OnDelete = "set_null"
	if _, err := hub.UpdateRelationship("lion", invalid, reference, true, false); !errors.Is(err, ErrRelationshipInvalid) {
		t.Fatalf("non-nullable SET NULL: got %v, want %v", err, ErrRelationshipInvalid)
	}
	base.OnDelete = "cascade"
	if _, err := hub.UpdateRelationship("lion", base, reference, true, false); err != nil {
		t.Fatalf("create cascade relationship: %v", err)
	}
	if got := hub.snapshotLocked().Relationships[0].OnDelete; got != "cascade" {
		t.Fatalf("onDelete: got %q, want cascade", got)
	}
	base.Kind = "label"
	if _, err := hub.UpdateRelationship("lion", base, reference, false, false); err != nil {
		t.Fatalf("change relationship kind: %v", err)
	}
	if got := hub.snapshotLocked().Relationships[0].OnDelete; got != "" {
		t.Fatalf("label onDelete: got %q, want empty", got)
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

func TestDFDStateSynchronizesValidGraphAndRejectsForbiddenConnections(t *testing.T) {
	hub := NewHub()
	hub.Join(Collaborator{ID: "lion", Name: "Lion"}, []ModelSeed{{ID: "order", Title: "Order"}}, nil, nil)
	valid := DFDState{
		Canvases: []DFDCanvas{{ID: "flow", Name: "Order flow"}},
		Nodes: []DFDNode{
			{ID: "process", DefinitionID: "process", CanvasID: "flow", Kind: "process", Name: "Receive order", ProcessKind: "ui", X: 20, Y: 40},
			{ID: "payload", DefinitionID: "payload", CanvasID: "flow", Kind: "intermediate", Name: "Order JSON", IntermediateKind: "api-payload", Format: "JSON", X: 260, Y: 40},
			{ID: "worker", DefinitionID: "worker", CanvasID: "flow", Kind: "process", Name: "Create order", ProcessKind: "batch", X: 500, Y: 40},
			{ID: "store", DefinitionID: "order", CanvasID: "flow", Kind: "model", ModelID: "order", X: 740, Y: 40},
		},
		Flows: []DFDFlow{
			{ID: "request", CanvasID: "flow", SourceID: "process", DestinationID: "payload", Label: "push", Protocol: "HTTPS"},
			{ID: "consume", CanvasID: "flow", SourceID: "payload", DestinationID: "worker"},
			{ID: "write", CanvasID: "flow", SourceID: "worker", DestinationID: "store"},
		},
	}
	if err := hub.UpdateDFD("lion", valid); err != nil {
		t.Fatalf("valid DFD: %v", err)
	}
	state := hub.snapshotLocked()
	if len(state.DFD.Nodes) != 4 || state.DFD.Flows[0].Protocol != "HTTPS" {
		t.Fatalf("DFD snapshot: %+v", state.DFD)
	}
	if state.DFD.Nodes[1].IntermediateKind != "file" {
		t.Fatalf("legacy API payload was not normalized to file: %+v", state.DFD.Nodes[1])
	}
	if len(state.DFD.Flows[2].CRUDAssignments) != 1 || state.DFD.Flows[2].CRUDAssignments[0].ProcessUnitID != "worker" || state.DFD.Flows[2].CRUDAssignments[0].ModelID != "order" || len(state.DFD.Flows[2].CRUDAssignments[0].Operations) != 1 || state.DFD.Flows[2].CRUDAssignments[0].Operations[0] != "C" {
		t.Fatalf("model CRUD defaults: %+v", state.DFD.Flows[2])
	}
	invalid := valid
	invalid.Flows = []DFDFlow{{ID: "direct", CanvasID: "flow", SourceID: "process", DestinationID: "worker"}}
	if err := hub.UpdateDFD("lion", invalid); !errors.Is(err, ErrDFDInvalid) {
		t.Fatalf("direct process flow: got %v, want %v", err, ErrDFDInvalid)
	}
	reverse := valid
	reverse.Flows = []DFDFlow{{ID: "reverse", CanvasID: "flow", SourceID: "store", DestinationID: "worker"}}
	if err := hub.UpdateDFD("lion", reverse); err != nil {
		t.Fatalf("right-to-left one-way flow: %v", err)
	}
	if got := hub.snapshotLocked().DFD.Flows[0].CRUDAssignments; len(got) != 1 || len(got[0].Operations) != 1 || got[0].Operations[0] != "R" {
		t.Fatalf("right-to-left CRUD default: %+v", got)
	}
	reverse.Flows[0].Bidirectional = true
	if err := hub.UpdateDFD("lion", reverse); err != nil {
		t.Fatalf("bidirectional reverse geometry: %v", err)
	}
	if got := hub.snapshotLocked().DFD.Flows[0].CRUDAssignments; len(got) != 1 || len(got[0].Operations) != 2 || got[0].Operations[0] != "C" || got[0].Operations[1] != "R" {
		t.Fatalf("bidirectional CRUD defaults: %+v", got)
	}
}

func TestDFDAllowsRepeatedExternalPlacementButNotRepeatedModel(t *testing.T) {
	hub := NewHub()
	hub.Join(Collaborator{ID: "lion", Name: "Lion"}, []ModelSeed{{ID: "order", Title: "Order"}}, nil, nil)
	base := DFDState{
		Canvases: []DFDCanvas{{ID: "flow", Name: "Flow"}},
		Nodes: []DFDNode{
			{ID: "customer-left", DefinitionID: "customer", CanvasID: "flow", Kind: "external", Name: "Customer"},
			{ID: "customer-right", DefinitionID: "customer", CanvasID: "flow", Kind: "external", Name: "Customer"},
			{ID: "order-a", DefinitionID: "order", CanvasID: "flow", Kind: "model", ModelID: "order"},
		},
	}
	if err := hub.UpdateDFD("lion", base); err != nil {
		t.Fatalf("repeated external placement: %v", err)
	}
	base.Nodes = append(base.Nodes, DFDNode{ID: "order-b", DefinitionID: "order", CanvasID: "flow", Kind: "model", ModelID: "order"})
	if err := hub.UpdateDFD("lion", base); !errors.Is(err, ErrDFDInvalid) {
		t.Fatalf("repeated model placement: got %v, want %v", err, ErrDFDInvalid)
	}
}

func TestDFDRejectsRepeatedProcessDefinitionAcrossProcessViews(t *testing.T) {
	hub := NewHub()
	hub.Join(Collaborator{ID: "lion", Name: "Lion"}, nil, nil, nil)
	state := DFDState{
		Canvases: []DFDCanvas{{ID: "flow", Name: "Flow"}},
		Nodes: []DFDNode{
			{ID: "physical", DefinitionID: "checkout", CanvasID: "flow", Kind: "process", Name: "Checkout", ProcessKind: "ui"},
			{ID: "logical", DefinitionID: "checkout", CanvasID: "flow", Kind: "logical-process", Name: "Checkout", PhysicalProcesses: []DFDPhysicalProcess{{Name: "Checkout UI"}}},
		},
	}
	if err := hub.UpdateDFD("lion", state); !errors.Is(err, ErrDFDInvalid) {
		t.Fatalf("repeated process definition: got %v, want %v", err, ErrDFDInvalid)
	}
}

func TestDFDNormalizesLogicalProcessAndStream(t *testing.T) {
	hub := NewHub()
	hub.Join(Collaborator{ID: "lion", Name: "Lion"}, nil, nil, nil)
	state := DFDState{Canvases: []DFDCanvas{{ID: "flow", Name: "Flow"}}, Nodes: []DFDNode{
		{ID: "logical", DefinitionID: "checkout", CanvasID: "flow", Kind: "logical-process", Name: "Checkout", PhysicalProcesses: []DFDPhysicalProcess{{Name: "Checkout UI"}}},
		{ID: "queue", DefinitionID: "events", CanvasID: "flow", Kind: "intermediate", Name: "Events", IntermediateKind: "stream", X: 260},
	}}
	if err := hub.UpdateDFD("lion", state); err != nil {
		t.Fatalf("normalize legacy DFD: %v", err)
	}
	got := hub.snapshotLocked().DFD
	if got.Nodes[0].Kind != "process" || got.Nodes[0].ProcessKind != "batch" || got.Nodes[1].IntermediateKind != "queue" {
		t.Fatalf("normalized nodes: %+v", got.Nodes)
	}
}

func TestDFDExpandsDetailedCRUDByPhysicalProcessAndGroupedModel(t *testing.T) {
	hub := NewHub()
	hub.Join(Collaborator{ID: "lion", Name: "Lion"}, []ModelSeed{{ID: "order", Title: "Order"}, {ID: "invoice", Title: "Invoice"}}, nil, nil)
	state := DFDState{
		Canvases: []DFDCanvas{{ID: "flow", Name: "Flow"}},
		Nodes: []DFDNode{
			{ID: "checkout", DefinitionID: "checkout", CanvasID: "flow", Kind: "process", Name: "Checkout", ProcessKind: "ui", PhysicalProcesses: []DFDPhysicalProcess{{ID: "screen", Name: "Screen"}, {ID: "submit", Name: "Submit"}}},
			{ID: "billing", DefinitionID: "billing", CanvasID: "flow", Kind: "process", Name: "Billing", ProcessKind: "batch"},
			{ID: "order-node", DefinitionID: "order", CanvasID: "flow", Kind: "model", ModelID: "order", X: 500},
			{ID: "invoice-node", DefinitionID: "invoice", CanvasID: "flow", Kind: "model", ModelID: "invoice", X: 500, Y: 140},
		},
		Groups: []DFDGroup{
			{ID: "processes", CanvasID: "flow", Kind: "process", MemberIDs: []string{"checkout", "billing"}},
			{ID: "models", CanvasID: "flow", Kind: "data_entity", MemberIDs: []string{"order-node", "invoice-node"}},
		},
		Flows: []DFDFlow{{
			ID: "write", CanvasID: "flow", SourceID: "processes", DestinationID: "models",
			CRUDAssignments: []DFDCRUDAssignment{{ProcessUnitID: "screen", ModelID: "order", Operations: []string{"U", "D"}}},
		}},
		CRUDMatrix: DFDCRUDMatrix{Orientation: "models_rows", ProcessOrder: []string{"billing", "stale", "screen"}, ModelOrder: []string{"invoice"}},
	}
	if err := hub.UpdateDFD("lion", state); err != nil {
		t.Fatalf("grouped CRUD state: %v", err)
	}
	got := hub.snapshotLocked().DFD
	if len(got.Flows[0].CRUDAssignments) != 6 {
		t.Fatalf("CRUD Cartesian product: %+v", got.Flows[0].CRUDAssignments)
	}
	first := got.Flows[0].CRUDAssignments[0]
	if first.ProcessUnitID != "screen" || first.ModelID != "order" || len(first.Operations) != 2 || first.Operations[0] != "U" || first.Operations[1] != "D" {
		t.Fatalf("custom CRUD assignment: %+v", first)
	}
	if got.CRUDMatrix.Orientation != "models_rows" || len(got.CRUDMatrix.ProcessOrder) != 3 || containsString(got.CRUDMatrix.ProcessOrder, "stale") || len(got.CRUDMatrix.ModelOrder) != 2 {
		t.Fatalf("normalized CRUD Matrix: %+v", got.CRUDMatrix)
	}

	state = got
	state.Nodes[0].PhysicalProcesses[0].Name = "Renamed screen"
	if err := hub.UpdateDFD("lion", state); err != nil {
		t.Fatalf("rename physical process: %v", err)
	}
	renamed := hub.snapshotLocked().DFD.Flows[0].CRUDAssignments[0]
	if renamed.ProcessUnitID != "screen" || len(renamed.Operations) != 2 || renamed.Operations[0] != "U" || renamed.Operations[1] != "D" {
		t.Fatalf("CRUD assignment did not survive rename: %+v", renamed)
	}
}

func TestCatalogOnlyDFDModelCannotBePlacedOnERD(t *testing.T) {
	hub := NewHub()
	hub.Join(Collaborator{ID: "lion", Name: "Lion"}, nil, nil, nil)
	seed := ModelSeed{ID: "payload", Title: "Payload", Role: "work", Dependency: "independent", UsageScope: "dfd_only"}
	if _, err := hub.UpdateCatalogSeed("lion", seed, true); err != nil {
		t.Fatalf("create DFD-only model: %v", err)
	}
	if got := hub.snapshotLocked(); len(got.Seeds) != 1 || len(got.Placements) != 0 || got.Seeds[0].UsageScope != "dfd_only" {
		t.Fatalf("catalog seed state: %+v", got)
	}
	if _, err := hub.UpdatePlacement("lion", CanvasModelPlacement{CanvasID: DefaultCanvasID, SeedID: seed.ID}, true); !errors.Is(err, ErrPlacementInvalid) {
		t.Fatalf("place DFD-only model: got %v, want %v", err, ErrPlacementInvalid)
	}
}
