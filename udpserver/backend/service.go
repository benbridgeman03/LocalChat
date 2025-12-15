package backend

import (
	"context"
	"sync"
	"time"
)

const (
	DiscoveryPort = 3000
	ChatPort      = 4001
	FilePort      = 4002
	BroadcastMsg  = "CHAT_PEER_DISCOVERY"
	PeerTimeout   = 5 * time.Second
)

type Peer struct {
	Address  string
	LastSeen time.Time
}

type PeerService struct {
	ctx               context.Context
	id                string
	myPort            string
	peers             map[string]*Peer
	peersMutex        sync.Mutex
	selectedFilePaths map[string]string
}

func NewPeerService(localPort string) *PeerService {
	ps := &PeerService{
		id:                generateID(),
		myPort:            localPort,
		peers:             make(map[string]*Peer),
		selectedFilePaths: make(map[string]string),
	}

	go ps.StartChatListener()
	go ps.StartFileListener()
	return ps
}

func (p *PeerService) SetContext(ctx context.Context) {
	p.ctx = ctx
	go p.discoveryLoop()
}
