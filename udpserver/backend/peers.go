package backend

import (
	"context"
	"fmt"
	"net"
	"sync"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

const (
	DiscoveryPort = 3000
	BroadcastMsg  = "CHAT_PEER_DISCOVERY"
	PeerTimeout   = 5 * time.Second
)

type Peer struct {
	Address  string
	LastSeen time.Time
}

type PeerService struct {
	ctx        context.Context
	myPort     string
	peers      map[string]*Peer
	peersMutex sync.Mutex
}

func NewPeerService(localPort string) *PeerService {
	ps := &PeerService{
		myPort: localPort,
		peers:  make(map[string]*Peer),
	}
	go ps.discoveryLoop()
	return ps
}

func (p *PeerService) SetContext(ctx context.Context) {
	p.ctx = ctx
}

func (p *PeerService) discoveryLoop() {
	go broadcastPresence(p.myPort)
	go listenForPeers(p)

	ticker := time.NewTicker(2 * time.Second)
	for range ticker.C {
		p.cleanupPeers()
	}
}

func broadcastPresence(localPort string) {
	broadcastAddr := fmt.Sprintf("255.255.255.255:%d", DiscoveryPort)
	addr, err := net.ResolveUDPAddr("udp4", broadcastAddr)
	if err != nil {
		fmt.Println("Failed to resolve broadcast address:", err)
		return
	}

	conn, err := net.ListenUDP("udp4", nil)
	if err != nil {
		fmt.Println("Failed to open UDP socket:", err)
		return
	}
	defer conn.Close()

	msg := fmt.Sprintf("%s:%s", BroadcastMsg, localPort)

	for {
		_, err := conn.WriteToUDP([]byte(msg), addr)
		if err != nil {
			fmt.Println("Broadcast send error:", err)
		}
		time.Sleep(1 * time.Second)
	}
}

func listenForPeers(p *PeerService) {
	addr, err := net.ResolveUDPAddr("udp4", fmt.Sprintf(":%d", DiscoveryPort))
	if err != nil {
		fmt.Println("Failed to resolve discovery address:", err)
		return
	}

	conn, err := net.ListenUDP("udp4", addr)
	if err != nil {
		fmt.Println("Failed to listen on discovery port:", err)
		return
	}
	defer conn.Close()

	buf := make([]byte, 1024)
	for {
		n, sender, err := conn.ReadFromUDP(buf)
		if err != nil {
			continue
		}

		msg := string(buf[:n])
		if len(msg) == 0 || len(msg) < len(BroadcastMsg)+2 {
			continue
		}

		if msg[:len(BroadcastMsg)] == BroadcastMsg {
			peerPort := msg[len(BroadcastMsg)+1:]
			if peerPort == p.myPort {
				continue
			}

			peerAddr := fmt.Sprintf("%s:%s", sender.IP.String(), peerPort)

			p.peersMutex.Lock()
			if peerEntry, exists := p.peers[peerAddr]; exists {
				peerEntry.LastSeen = time.Now()
			} else {
				p.peers[peerAddr] = &Peer{
					Address:  peerAddr,
					LastSeen: time.Now(),
				}
				if p.ctx != nil {
					runtime.EventsEmit(p.ctx, "peer:found", peerAddr)
				}
				fmt.Println("Discovered new peer:", peerAddr)
			}
			p.peersMutex.Unlock()
		}
	}
}

func (p *PeerService) cleanupPeers() {
	p.peersMutex.Lock()
	defer p.peersMutex.Unlock()

	now := time.Now()
	for addr, peer := range p.peers {
		if now.Sub(peer.LastSeen) > PeerTimeout {
			delete(p.peers, addr)
			if p.ctx != nil {
				runtime.EventsEmit(p.ctx, "peer:removed", addr)
			}
			fmt.Println("Peer removed due to timeout:", addr)
		}
	}
}

func (p *PeerService) GetPeers() []string {
	p.peersMutex.Lock()
	defer p.peersMutex.Unlock()

	list := make([]string, 0, len(p.peers))
	for addr := range p.peers {
		list = append(list, addr)
	}
	return list
}
