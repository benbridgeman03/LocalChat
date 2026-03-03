package backend

import (
	"archive/zip"
	"encoding/json"
	"io"
	"net"
	"os"
	"path/filepath"
	"sort"
	"sync"
	"testing"
	"time"
)

func TestFileOfferJSON(t *testing.T) {
	offer := FileOffer{
		Filename: "test.txt",
		Size:     12345,
		Sender:   "192.168.1.10",
	}

	data, err := json.Marshal(offer)
	if err != nil {
		t.Fatalf("failed to marshal FileOffer: %v", err)
	}

	var decoded FileOffer
	err = json.Unmarshal(data, &decoded)
	if err != nil {
		t.Fatalf("failed to unmarshal FileOffer: %v", err)
	}

	if decoded.Filename != offer.Filename {
		t.Errorf("expected filename %q, got %q", offer.Filename, decoded.Filename)
	}
	if decoded.Size != offer.Size {
		t.Errorf("expected size %d, got %d", offer.Size, decoded.Size)
	}
	if decoded.Sender != offer.Sender {
		t.Errorf("expected sender %q, got %q", offer.Sender, decoded.Sender)
	}
}

func TestFileResponseJSON(t *testing.T) {
	resp := FileResponse{
		Filename: "report.pdf",
		Type:     "ACCEPTED",
		Port:     9876,
	}

	data, err := json.Marshal(resp)
	if err != nil {
		t.Fatalf("failed to marshal FileResponse: %v", err)
	}

	var decoded FileResponse
	err = json.Unmarshal(data, &decoded)
	if err != nil {
		t.Fatalf("failed to unmarshal FileResponse: %v", err)
	}

	if decoded.Filename != resp.Filename {
		t.Errorf("expected filename %q, got %q", resp.Filename, decoded.Filename)
	}
	if decoded.Type != resp.Type {
		t.Errorf("expected type %q, got %q", resp.Type, decoded.Type)
	}
	if decoded.Port != resp.Port {
		t.Errorf("expected port %d, got %d", resp.Port, decoded.Port)
	}
}

func TestFileResponseJSONOmitPort(t *testing.T) {
	resp := FileResponse{
		Filename: "report.pdf",
		Type:     "REJECTED",
		Port:     0,
	}

	data, err := json.Marshal(resp)
	if err != nil {
		t.Fatalf("failed to marshal FileResponse: %v", err)
	}

	var raw map[string]interface{}
	json.Unmarshal(data, &raw)
	if _, exists := raw["port"]; exists {
		t.Error("expected port to be omitted when zero")
	}
}

func TestProgressPayloadJSON(t *testing.T) {
	payload := ProgressPayload{
		Filename:   "video.mp4",
		Percentage: 75.5,
		Type:       "upload",
	}

	data, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("failed to marshal ProgressPayload: %v", err)
	}

	var decoded ProgressPayload
	err = json.Unmarshal(data, &decoded)
	if err != nil {
		t.Fatalf("failed to unmarshal ProgressPayload: %v", err)
	}

	if decoded.Filename != payload.Filename {
		t.Errorf("expected filename %q, got %q", payload.Filename, decoded.Filename)
	}
	if decoded.Percentage != payload.Percentage {
		t.Errorf("expected percentage %f, got %f", payload.Percentage, decoded.Percentage)
	}
	if decoded.Type != payload.Type {
		t.Errorf("expected type %q, got %q", payload.Type, decoded.Type)
	}
}

func TestZipSource(t *testing.T) {
	srcDir := t.TempDir()
	testContent := "hello world"

	err := os.WriteFile(filepath.Join(srcDir, "file1.txt"), []byte(testContent), 0644)
	if err != nil {
		t.Fatalf("failed to create test file: %v", err)
	}
	err = os.WriteFile(filepath.Join(srcDir, "file2.txt"), []byte("second file"), 0644)
	if err != nil {
		t.Fatalf("failed to create test file: %v", err)
	}

	zipPath := filepath.Join(t.TempDir(), "test.zip")
	err = zipSource(srcDir, zipPath)
	if err != nil {
		t.Fatalf("zipSource failed: %v", err)
	}

	reader, err := zip.OpenReader(zipPath)
	if err != nil {
		t.Fatalf("failed to open zip: %v", err)
	}
	defer reader.Close()

	names := make([]string, 0)
	for _, f := range reader.File {
		names = append(names, filepath.Base(f.Name))
	}
	sort.Strings(names)

	foundFile1 := false
	foundFile2 := false
	for _, name := range names {
		if name == "file1.txt" {
			foundFile1 = true
		}
		if name == "file2.txt" {
			foundFile2 = true
		}
	}

	if !foundFile1 || !foundFile2 {
		t.Errorf("expected file1.txt and file2.txt in zip, got entries: %v", names)
	}

	for _, f := range reader.File {
		if filepath.Base(f.Name) == "file1.txt" {
			rc, err := f.Open()
			if err != nil {
				t.Fatalf("failed to open file in zip: %v", err)
			}
			content, err := io.ReadAll(rc)
			rc.Close()
			if err != nil {
				t.Fatalf("failed to read file in zip: %v", err)
			}
			if string(content) != testContent {
				t.Errorf("expected content %q, got %q", testContent, string(content))
			}
			break
		}
	}
}

func TestZipSourceNested(t *testing.T) {
	srcDir := t.TempDir()
	subDir := filepath.Join(srcDir, "subdir")
	err := os.MkdirAll(subDir, 0755)
	if err != nil {
		t.Fatalf("failed to create subdirectory: %v", err)
	}

	os.WriteFile(filepath.Join(srcDir, "root.txt"), []byte("root"), 0644)
	os.WriteFile(filepath.Join(subDir, "nested.txt"), []byte("nested"), 0644)

	zipPath := filepath.Join(t.TempDir(), "nested.zip")
	err = zipSource(srcDir, zipPath)
	if err != nil {
		t.Fatalf("zipSource failed: %v", err)
	}

	reader, err := zip.OpenReader(zipPath)
	if err != nil {
		t.Fatalf("failed to open zip: %v", err)
	}
	defer reader.Close()

	foundRoot := false
	foundNested := false
	for _, f := range reader.File {
		if filepath.Base(f.Name) == "root.txt" {
			foundRoot = true
		}
		if filepath.Base(f.Name) == "nested.txt" {
			foundNested = true
		}
	}

	if !foundRoot {
		t.Error("expected root.txt in zip")
	}
	if !foundNested {
		t.Error("expected nested.txt in zip")
	}
}

func TestTCPFileTransfer(t *testing.T) {
	srcDir := t.TempDir()
	testContent := []byte("This is the file content for TCP transfer test.")
	srcFile := filepath.Join(srcDir, "transfer_test.dat")
	err := os.WriteFile(srcFile, testContent, 0644)
	if err != nil {
		t.Fatalf("failed to create test file: %v", err)
	}

	ps := &PeerService{
		peers:             make(map[string]*Peer),
		selectedFilePaths: make(map[string]string),
		peersMutex:        sync.Mutex{},
	}
	ps.selectedFilePaths["transfer_test.dat"] = srcFile

	port, err := ps.StartTCPFileReceiver("transfer_test.dat", int64(len(testContent)))
	if err != nil {
		t.Fatalf("failed to start TCP receiver: %v", err)
	}

	time.Sleep(100 * time.Millisecond)

	ps.StartTCPFileSender("127.0.0.1", port, "transfer_test.dat")

	time.Sleep(500 * time.Millisecond)

	homeDir, _ := os.UserHomeDir()
	receivedPath := filepath.Join(homeDir, "Downloads", "transfer_test.dat")
	defer os.Remove(receivedPath)

	receivedContent, err := os.ReadFile(receivedPath)
	if err != nil {
		t.Fatalf("failed to read received file: %v", err)
	}

	if string(receivedContent) != string(testContent) {
		t.Errorf("expected content %q, got %q", string(testContent), string(receivedContent))
	}
}

func TestSendFileOfferUDP(t *testing.T) {
	listenAddr, err := net.ResolveUDPAddr("udp4", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("failed to resolve address: %v", err)
	}

	conn, err := net.ListenUDP("udp4", listenAddr)
	if err != nil {
		t.Fatalf("failed to start listener: %v", err)
	}
	defer conn.Close()

	received := make(chan []byte, 1)
	go func() {
		buf := make([]byte, 2048)
		conn.SetReadDeadline(time.Now().Add(5 * time.Second))
		n, _, err := conn.ReadFromUDP(buf)
		if err != nil {
			received <- nil
			return
		}
		received <- buf[:n]
	}()

	offer := FileOffer{
		Filename: "test.txt",
		Size:     1024,
		Sender:   "test-id",
	}

	data, _ := json.Marshal(offer)

	sendAddr, _ := net.ResolveUDPAddr("udp4", conn.LocalAddr().String())
	sendConn, err := net.DialUDP("udp4", nil, sendAddr)
	if err != nil {
		t.Fatalf("failed to dial: %v", err)
	}
	defer sendConn.Close()

	_, err = sendConn.Write(data)
	if err != nil {
		t.Fatalf("failed to send: %v", err)
	}

	select {
	case msg := <-received:
		if msg == nil {
			t.Fatal("received nil message")
		}
		var decoded FileOffer
		err := json.Unmarshal(msg, &decoded)
		if err != nil {
			t.Fatalf("failed to unmarshal received offer: %v", err)
		}
		if decoded.Filename != offer.Filename {
			t.Errorf("expected filename %q, got %q", offer.Filename, decoded.Filename)
		}
		if decoded.Size != offer.Size {
			t.Errorf("expected size %d, got %d", offer.Size, decoded.Size)
		}
	case <-time.After(5 * time.Second):
		t.Error("timed out waiting for file offer")
	}
}
