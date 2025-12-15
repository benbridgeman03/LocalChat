package backend

import (
	"fmt"
	"net"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

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
