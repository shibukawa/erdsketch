package collaboration

import (
	"errors"
	"testing"
)

func TestSeedUpdateRequiresOwningLock(t *testing.T) {
	hub := NewHub()
	hub.Join(Collaborator{ID: "lion", Name: "Lion"}, []ModelSeed{{ID: "order", Title: "Order"}})

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
	hub.Join(Collaborator{ID: "lion", Name: "Lion"}, []ModelSeed{{ID: "order", Title: "Order"}})
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

func TestSeedUpdateSynchronizesMaturedLevel(t *testing.T) {
	hub := NewHub()
	hub.Join(Collaborator{ID: "lion", Name: "Lion"}, []ModelSeed{{ID: "order", MaturedLevel: 6}})
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
	hub.Join(Collaborator{ID: "lion", Name: "Lion"}, nil)
	hub.Join(Collaborator{ID: "koara", Name: "Koara"}, nil)

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
	hub.Join(Collaborator{ID: "lion", Name: "Lion"}, nil)
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
