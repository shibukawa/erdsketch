package relay

import (
	"encoding/json"
	"testing"
)

func TestFirstParticipantIsHostAndMessagesRouteThroughHost(t *testing.T) {
	hub := NewHub()
	host := hub.Join("host", json.RawMessage(`{"name":"Host"}`))
	if host.Role != "host" || host.HostID != "host" {
		t.Fatalf("host join: %#v", host)
	}
	hostStream, err := hub.Subscribe("host")
	if err != nil {
		t.Fatal(err)
	}
	participant := hub.Join("peer", json.RawMessage(`{"name":"Peer"}`))
	if participant.Role != "participant" || participant.HostID != "host" {
		t.Fatalf("participant join: %#v", participant)
	}
	<-hostStream // participant_joined
	peerStream, err := hub.Subscribe("peer")
	if err != nil {
		t.Fatal(err)
	}
	if err := hub.Publish("peer", Message{Kind: "operation_intent", MessageID: "m1"}); err != nil {
		t.Fatal(err)
	}
	if got := <-hostStream; got.Kind != "operation_intent" || got.SenderID != "peer" {
		t.Fatalf("host message: %#v", got)
	}
	if err := hub.Publish("host", Message{Kind: "operation_accepted", MessageID: "m1"}); err != nil {
		t.Fatal(err)
	}
	if got := <-peerStream; got.Kind != "operation_accepted" || got.SenderID != "host" {
		t.Fatalf("peer message: %#v", got)
	}
}

func TestOnlyFirstParticipantPassesHostCheck(t *testing.T) {
	hub := NewHub()
	hub.Join("host", nil)
	hub.Join("peer", nil)
	if err := hub.RequireHost("host"); err != nil {
		t.Fatal(err)
	}
	if err := hub.RequireHost("peer"); err != ErrHostRequired {
		t.Fatalf("peer host check: %v", err)
	}
}

func TestDisconnectRemovesParticipantFromFutureJoinResults(t *testing.T) {
	hub := NewHub()
	hub.Join("host", nil)
	hub.Join("peer", nil)
	stream, err := hub.Subscribe("peer")
	if err != nil {
		t.Fatal(err)
	}
	hub.Disconnect("peer", stream)

	joined := hub.Join("next", nil)
	for _, participant := range joined.Participants {
		if participant.ClientID == "peer" {
			t.Fatalf("disconnected participant remained in join result: %#v", joined)
		}
	}
}
