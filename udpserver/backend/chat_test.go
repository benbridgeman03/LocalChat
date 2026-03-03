package backend

import (
	"fmt"
	"net"
	"testing"
	"time"
)

func TestSendMessageInvalidAddress(t *testing.T) {
	ps := &PeerService{
		peers: make(map[string]*Peer),
	}

	err := ps.SendMessage("not-a-valid-address", "hello")
	if err == nil {
		t.Error("expected error for invalid address, got nil")
	}
}

func TestSendAndReceiveMessage(t *testing.T) {
	listenAddr, err := net.ResolveUDPAddr("udp4", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("failed to resolve listen address: %v", err)
	}

	conn, err := net.ListenUDP("udp4", listenAddr)
	if err != nil {
		t.Fatalf("failed to start UDP listener: %v", err)
	}
	defer conn.Close()

	actualPort := conn.LocalAddr().(*net.UDPAddr).Port

	received := make(chan string, 1)
	go func() {
		buf := make([]byte, 2048)
		conn.SetReadDeadline(time.Now().Add(5 * time.Second))
		n, _, err := conn.ReadFromUDP(buf)
		if err != nil {
			received <- ""
			return
		}
		received <- string(buf[:n])
	}()

	ps := &PeerService{
		peers: make(map[string]*Peer),
	}

	testMsg := "Hello, World!"

	targetAddr, err := net.ResolveUDPAddr("udp4", fmt.Sprintf("127.0.0.1:%d", actualPort))
	if err != nil {
		t.Fatalf("failed to resolve target address: %v", err)
	}

	sendConn, err := net.DialUDP("udp4", nil, targetAddr)
	if err != nil {
		t.Fatalf("failed to dial: %v", err)
	}
	defer sendConn.Close()

	_, err = sendConn.Write([]byte(testMsg))
	if err != nil {
		t.Fatalf("failed to send message: %v", err)
	}

	select {
	case msg := <-received:
		if msg != testMsg {
			t.Errorf("expected message %q, got %q", testMsg, msg)
		}
	case <-time.After(5 * time.Second):
		t.Error("timed out waiting for message")
	}

	_ = ps.SendMessage("127.0.0.1:5000", "test")
}

func TestSendMessageValidAddress(t *testing.T) {
	ps := &PeerService{
		peers: make(map[string]*Peer),
	}

	err := ps.SendMessage("127.0.0.1:5000", "test message")
	if err != nil {
		t.Errorf("expected no error for valid address, got: %v", err)
	}
}
