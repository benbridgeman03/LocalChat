package backend

import (
	"encoding/hex"
	"sync"
	"testing"
	"time"
)

func TestGenerateID(t *testing.T) {
	id := generateID()

	if len(id) != 32 {
		t.Errorf("expected ID length 32, got %d", len(id))
	}

	_, err := hex.DecodeString(id)
	if err != nil {
		t.Errorf("expected valid hex string, got error: %v", err)
	}
}

func TestGenerateIDUniqueness(t *testing.T) {
	ids := make(map[string]bool)
	for i := 0; i < 100; i++ {
		id := generateID()
		if ids[id] {
			t.Errorf("duplicate ID generated: %s", id)
		}
		ids[id] = true
	}
}

func TestGetPeersEmpty(t *testing.T) {
	ps := &PeerService{
		peers: make(map[string]*Peer),
	}

	peers := ps.GetPeers()
	if len(peers) != 0 {
		t.Errorf("expected 0 peers, got %d", len(peers))
	}
}

func TestGetPeers(t *testing.T) {
	ps := &PeerService{
		peers: make(map[string]*Peer),
	}

	ps.peers["192.168.1.10:5000"] = &Peer{Address: "192.168.1.10:5000", LastSeen: time.Now()}
	ps.peers["192.168.1.11:5000"] = &Peer{Address: "192.168.1.11:5000", LastSeen: time.Now()}

	peers := ps.GetPeers()
	if len(peers) != 2 {
		t.Errorf("expected 2 peers, got %d", len(peers))
	}

	found := make(map[string]bool)
	for _, p := range peers {
		found[p] = true
	}
	if !found["192.168.1.10:5000"] || !found["192.168.1.11:5000"] {
		t.Errorf("expected both peer addresses, got %v", peers)
	}
}

func TestCleanupPeersRemovesExpired(t *testing.T) {
	ps := &PeerService{
		peers: make(map[string]*Peer),
	}

	ps.peers["192.168.1.10:5000"] = &Peer{
		Address:  "192.168.1.10:5000",
		LastSeen: time.Now(),
	}

	ps.peers["192.168.1.11:5000"] = &Peer{
		Address:  "192.168.1.11:5000",
		LastSeen: time.Now().Add(-10 * time.Second),
	}

	ps.cleanupPeers()

	if len(ps.peers) != 1 {
		t.Errorf("expected 1 peer after cleanup, got %d", len(ps.peers))
	}
	if _, exists := ps.peers["192.168.1.10:5000"]; !exists {
		t.Error("expected fresh peer to remain after cleanup")
	}
	if _, exists := ps.peers["192.168.1.11:5000"]; exists {
		t.Error("expected expired peer to be removed after cleanup")
	}
}

func TestCleanupPeersKeepsAllFresh(t *testing.T) {
	ps := &PeerService{
		peers: make(map[string]*Peer),
	}

	ps.peers["192.168.1.10:5000"] = &Peer{
		Address:  "192.168.1.10:5000",
		LastSeen: time.Now(),
	}
	ps.peers["192.168.1.11:5000"] = &Peer{
		Address:  "192.168.1.11:5000",
		LastSeen: time.Now(),
	}

	ps.cleanupPeers()

	if len(ps.peers) != 2 {
		t.Errorf("expected 2 peers after cleanup, got %d", len(ps.peers))
	}
}

func TestGetPeersConcurrent(t *testing.T) {
	ps := &PeerService{
		peers:      make(map[string]*Peer),
		peersMutex: sync.Mutex{},
	}

	ps.peers["192.168.1.10:5000"] = &Peer{Address: "192.168.1.10:5000", LastSeen: time.Now()}

	done := make(chan bool, 10)
	for i := 0; i < 10; i++ {
		go func() {
			peers := ps.GetPeers()
			if len(peers) != 1 {
				t.Errorf("expected 1 peer, got %d", len(peers))
			}
			done <- true
		}()
	}
	for i := 0; i < 10; i++ {
		<-done
	}
}
