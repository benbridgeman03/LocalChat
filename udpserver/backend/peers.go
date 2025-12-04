package backend

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"net"
	"strings"
	"sync"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

const (
	DiscoveryPort = 3000
	ChatPort      = 4001
	BroadcastMsg  = "CHAT_PEER_DISCOVERY"
	PeerTimeout   = 5 * time.Second
)

type Peer struct {
	Address  string
	LastSeen time.Time
}

type PeerService struct {
	ctx        context.Context
	id         string
	myPort     string
	peers      map[string]*Peer
	peersMutex sync.Mutex
}

func NewPeerService(localPort string) *PeerService {
	ps := &PeerService{
		id:     generateID(),
		myPort: localPort,
		peers:  make(map[string]*Peer),
	}

	go ps.StartChatListener()
	return ps
}

func (p *PeerService) SetContext(ctx context.Context) {
	p.ctx = ctx
	go p.discoveryLoop()
}

func generateID() string {
	bytes := make([]byte, 16)
	if _, err := rand.Read(bytes); err != nil {
		return "unknown"
	}
	return hex.EncodeToString(bytes)
}

func (p *PeerService) discoveryLoop() {
	go broadcastPresence(p.id, p.myPort)
	go listenForPeers(p)

	ticker := time.NewTicker(2 * time.Second)
	for range ticker.C {
		p.cleanupPeers()
	}
}

func broadcastPresence(id string, localPort string) {
	conn, err := net.ListenUDP("udp4", nil)
	if err != nil {
		fmt.Println("Failed to open UDP socket:", err)
		return
	}
	defer conn.Close()

	msg := fmt.Sprintf("%s:%s:%s", BroadcastMsg, id, localPort)

	for {
		interfaces, err := net.Interfaces()
		if err != nil {
			fmt.Println("Error listing interfaces:", err)
			time.Sleep(1 * time.Second)
			continue
		}

		for _, iface := range interfaces {
			if (iface.Flags&net.FlagUp) == 0 || (iface.Flags&net.FlagLoopback) != 0 {
				continue
			}

			addrs, err := iface.Addrs()
			if err != nil {
				continue
			}

			for _, addr := range addrs {
				ipNet, ok := addr.(*net.IPNet)
				if !ok || ipNet.IP.To4() == nil {
					continue
				}

				ip := ipNet.IP.To4()
				mask := ipNet.Mask
				broadcastIP := net.IP(make([]byte, 4))
				for i := 0; i < 4; i++ {
					broadcastIP[i] = ip[i] | ^mask[i]
				}

				dstAddr := &net.UDPAddr{
					IP:   broadcastIP,
					Port: DiscoveryPort,
				}

				_, err := conn.WriteToUDP([]byte(msg), dstAddr)
				if err != nil {
					fmt.Printf("Broadcast error on %s: %v\n", iface.Name, err)
				}
			}
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
		if len(msg) < len(BroadcastMsg) {
			continue
		}

		if msg[:len(BroadcastMsg)] == BroadcastMsg {
			parts := strings.Split(msg, ":")
			if len(parts) != 3 {
				continue
			}
			peerID := parts[1]
			peerPort := parts[2]

			if peerID == p.id {
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

func (p *PeerService) StartChatListener() {
	addr, _ := net.ResolveUDPAddr("udp4", fmt.Sprintf(":%d", ChatPort))
	conn, _ := net.ListenUDP("udp4", addr)

	buf := make([]byte, 2048)

	go func() {
		for {
			n, sender, err := conn.ReadFromUDP(buf)
			if err != nil {
				continue
			}

			msg := string(buf[:n])

			if p.ctx != nil {
				runtime.EventsEmit(p.ctx, "chat:message", sender.String(), msg)
			}
		}
	}()
}

func (p *PeerService) SendMessage(address, message string) error {
	host, _, err := net.SplitHostPort(address)
	if err != nil {
		return err
	}

	peerAddr, err := net.ResolveUDPAddr("udp4", fmt.Sprintf("%s:%d", host, ChatPort))
	if err != nil {
		return err
	}

	conn, err := net.DialUDP("udp4", nil, peerAddr)
	if err != nil {
		return err
	}
	defer conn.Close()

	_, err = conn.Write([]byte(message))
	return err
}
