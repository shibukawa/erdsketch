package relay

import (
	"encoding/json"
	"errors"
	"sync"
)

var (
	ErrUnknownClient = errors.New("unknown relay client")
	ErrHostRequired  = errors.New("session host required")
)

type Message struct {
	Kind      string          `json:"kind"`
	MessageID string          `json:"messageId,omitempty"`
	SenderID  string          `json:"senderId"`
	TargetID  string          `json:"targetId,omitempty"`
	Payload   json.RawMessage `json:"payload,omitempty"`
}

type Participant struct {
	ClientID string          `json:"clientId"`
	User     json.RawMessage `json:"user"`
}

type JoinResult struct {
	Role         string        `json:"role"`
	HostID       string        `json:"hostId"`
	Participants []Participant `json:"participants"`
}

type Hub struct {
	mu      sync.Mutex
	hostID  string
	members map[string]Participant
	streams map[string]chan Message
}

func NewHub() *Hub {
	return &Hub{members: make(map[string]Participant), streams: make(map[string]chan Message)}
}

func (h *Hub) Join(clientID string, user json.RawMessage) JoinResult {
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.hostID == "" {
		h.hostID = clientID
	}
	participant := Participant{ClientID: clientID, User: append(json.RawMessage(nil), user...)}
	h.members[clientID] = participant
	if clientID != h.hostID {
		h.sendLocked(h.hostID, Message{Kind: "participant_joined", SenderID: clientID, Payload: participant.User})
	}
	participants := make([]Participant, 0, len(h.members))
	for _, member := range h.members {
		participants = append(participants, member)
	}
	role := "participant"
	if clientID == h.hostID {
		role = "host"
	}
	return JoinResult{Role: role, HostID: h.hostID, Participants: participants}
}

func (h *Hub) Subscribe(clientID string) (<-chan Message, error) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if _, ok := h.members[clientID]; !ok {
		return nil, ErrUnknownClient
	}
	stream := make(chan Message, 32)
	h.streams[clientID] = stream
	if clientID == h.hostID {
		for memberID, member := range h.members {
			if memberID != clientID {
				h.sendLocked(clientID, Message{Kind: "participant_joined", SenderID: memberID, Payload: member.User})
			}
		}
	}
	return stream, nil
}

func (h *Hub) Disconnect(clientID string, stream <-chan Message) {
	h.mu.Lock()
	defer h.mu.Unlock()
	current := h.streams[clientID]
	if current == nil || (<-chan Message)(current) != stream {
		return
	}
	delete(h.streams, clientID)
	if clientID != h.hostID {
		delete(h.members, clientID)
		payload, _ := json.Marshal(map[string]string{"clientId": clientID})
		h.sendLocked(h.hostID, Message{Kind: "participant_left", SenderID: clientID, Payload: payload})
	}
}

func (h *Hub) Publish(clientID string, message Message) error {
	h.mu.Lock()
	defer h.mu.Unlock()
	if _, ok := h.members[clientID]; !ok {
		return ErrUnknownClient
	}
	message.SenderID = clientID
	if clientID != h.hostID {
		h.sendLocked(h.hostID, message)
		return nil
	}
	if message.TargetID != "" {
		h.sendLocked(message.TargetID, message)
		return nil
	}
	for memberID := range h.members {
		if memberID != clientID {
			h.sendLocked(memberID, message)
		}
	}
	return nil
}

func (h *Hub) IsHost(clientID string) bool {
	h.mu.Lock()
	defer h.mu.Unlock()
	return clientID != "" && clientID == h.hostID
}

func (h *Hub) RequireHost(clientID string) error {
	if !h.IsHost(clientID) {
		return ErrHostRequired
	}
	return nil
}

func (h *Hub) sendLocked(clientID string, message Message) {
	stream := h.streams[clientID]
	if stream == nil {
		return
	}
	select {
	case stream <- message:
	default:
		select {
		case <-stream:
		default:
		}
		select {
		case stream <- message:
		default:
		}
	}
}
