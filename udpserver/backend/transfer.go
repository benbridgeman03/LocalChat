package backend

import (
	"archive/zip"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"os"
	"path/filepath"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type FileOffer struct {
	Filename string `json:"filename"`
	Size     int64  `json:"size"`
	Sender   string `json:"sender"`
}

type FileResponse struct {
	Filename string `json:"filename"`
	Type     string `json:"type"`
	Port     int    `json:"port,omitempty"`
}

type ProgressPayload struct {
	Filename   string  `json:"filename"`
	Percentage float64 `json:"percentage"`
	Type       string  `json:"type"`
}

func (p *PeerService) StartFileListener() {
	addr, _ := net.ResolveUDPAddr("udp4", fmt.Sprintf(":%d", FilePort))
	conn, _ := net.ListenUDP("udp4", addr)

	buf := make([]byte, 2048)

	go func() {
		for {
			n, senderAddr, err := conn.ReadFromUDP(buf)
			if err != nil {
				continue
			}

			msg := buf[:n]

			var typeCheck struct {
				Type string `json:"type"`
			}
			if err := json.Unmarshal(msg, &typeCheck); err == nil && typeCheck.Type != "" {
				var resp FileResponse
				if err := json.Unmarshal(msg, &resp); err == nil {
					fmt.Printf("Received File Response: %s for %s\n", resp.Type, resp.Filename)

					if p.ctx != nil {
						runtime.EventsEmit(p.ctx, "file:response", resp)
					}

					if resp.Type == "ACCEPTED" && resp.Port > 0 {
						go p.StartTCPFileSender(senderAddr.IP.String(), resp.Port, resp.Filename)
					}
				}
				continue
			}
			var offer FileOffer

			err = json.Unmarshal(msg, &offer)

			offer.Sender = senderAddr.IP.String()

			if err != nil {
				fmt.Println("Invalid file offer received:", err)
				continue
			}

			if offer.Filename == "" {
				continue
			}

			if p.ctx != nil {
				runtime.EventsEmit(p.ctx, "file:offer", offer)
			}
		}
	}()
}

func (p *PeerService) SelectAndSendFile(targetAddress string) {
	selection, err := runtime.OpenFileDialog(p.ctx, runtime.OpenDialogOptions{
		Title: "Select File to Send",
	})

	if err != nil || selection == "" {
		return
	}

	fileInfo, err := os.Stat(selection)
	if err != nil {
		fmt.Println("Error reading file info:", err)
		return
	}

	filename := fileInfo.Name()
	size := fileInfo.Size()

	p.peersMutex.Lock()
	p.selectedFilePaths[filename] = selection
	p.peersMutex.Unlock()

	host, _, err := net.SplitHostPort(targetAddress)
	if err != nil {
		fmt.Println("Invalid address:", err)
		return
	}

	p.sendFileOfferUDP(host, filename, size)
}

func (p *PeerService) SelectAndSendFolder(targetAddress string) {
	selection, err := runtime.OpenDirectoryDialog(p.ctx, runtime.OpenDialogOptions{
		Title: "Select Folder to Send",
	})

	if err != nil || selection == "" {
		return
	}

	folderName := filepath.Base(selection)
	zipFilename := folderName + ".zip"
	tempZipPath := filepath.Join(os.TempDir(), zipFilename)

	fmt.Println("Zipping folder:", selection)
	err = zipSource(selection, tempZipPath)
	if err != nil {
		fmt.Println("Error zipping folder:", err)
		return
	}

	fileInfo, err := os.Stat(tempZipPath)
	if err != nil {
		fmt.Println("Error reading zip info:", err)
		return
	}
	size := fileInfo.Size()

	p.peersMutex.Lock()
	p.selectedFilePaths[zipFilename] = tempZipPath
	p.peersMutex.Unlock()

	host, _, err := net.SplitHostPort(targetAddress)
	if err != nil {
		fmt.Println("Invalid address:", err)
		return
	}

	p.sendFileOfferUDP(host, zipFilename, size)
}

func zipSource(source, target string) error {
	f, err := os.Create(target)
	if err != nil {
		return err
	}
	defer f.Close()

	writer := zip.NewWriter(f)
	defer writer.Close()

	return filepath.Walk(source, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		header, err := zip.FileInfoHeader(info)
		if err != nil {
			return err
		}

		header.Name, err = filepath.Rel(filepath.Dir(source), path)
		if err != nil {
			return err
		}

		if info.IsDir() {
			header.Name += "/"
		} else {
			header.Method = zip.Deflate
		}

		writer, err := writer.CreateHeader(header)
		if err != nil {
			return err
		}

		if info.IsDir() {
			return nil
		}

		file, err := os.Open(path)
		if err != nil {
			return err
		}
		defer file.Close()
		_, err = io.Copy(writer, file)
		return err
	})
}

func (p *PeerService) sendFileOfferUDP(targetIP string, filename string, size int64) {
	offer := FileOffer{
		Filename: filename,
		Size:     size,
		Sender:   p.id,
	}

	data, _ := json.Marshal(offer)

	addr, _ := net.ResolveUDPAddr("udp4", fmt.Sprintf("%s:%d", targetIP, 4002))
	conn, _ := net.DialUDP("udp4", nil, addr)
	defer conn.Close()

	conn.Write(data)
	fmt.Printf("Sent file offer for %s to %s\n", filename, targetIP)
}

func (p *PeerService) StartTCPFileSender(targetIP string, port int, filename string) {
	p.peersMutex.Lock()
	fullPath, exists := p.selectedFilePaths[filename]
	p.peersMutex.Unlock()

	if !exists {
		fmt.Println("Error: Could not find original path for", filename)
		return
	}

	file, err := os.Open(fullPath)
	if err != nil {
		fmt.Println("Error opening file for sending:", err)
		return
	}
	defer file.Close()

	fileInfo, _ := file.Stat()
	fileSize := fileInfo.Size()

	conn, err := net.Dial("tcp", fmt.Sprintf("%s:%d", targetIP, port))
	if err != nil {
		fmt.Printf("Failed to dial receiver %s:%d - %v\n", targetIP, port, err)
		return
	}
	defer conn.Close()

	fmt.Println("Starting upload for:", filename)

	buffer := make([]byte, 4096)
	var totalSent int64

	for {
		n, err := file.Read(buffer)
		if err != nil {
			if err == io.EOF {
				break
			}
			fmt.Println("Error reading file:", err)
			return
		}

		_, writeErr := conn.Write(buffer[:n])
		if writeErr != nil {
			fmt.Println("Error writing to connection:", writeErr)
			return
		}

		totalSent += int64(n)
		percentage := (float64(totalSent) / float64(fileSize)) * 100

		if p.ctx != nil {
			runtime.EventsEmit(p.ctx, "file:progress", ProgressPayload{
				Filename:   filepath.Base(filename),
				Percentage: percentage,
				Type:       "upload",
			})
		}
	}
}

func (p *PeerService) AcceptFileOffer(sender string, filename string, size int64) {
	fmt.Printf("File offer accepted")

	port, err := p.StartTCPFileReceiver(filename, size)
	if err != nil {
		fmt.Println("Error starting receiver:", err)
		return
	}

	p.SendFileResponse(sender, "ACCEPTED", filename, port)
}

func (p *PeerService) DeclineFileOffer(sender string, filename string) {
	fmt.Printf("File offer rejected")
	p.SendFileResponse(sender, "REJECTED", filename, 0)
}

func (p *PeerService) SendFileResponse(targetIp string, status string, filename string, port int) {
	resp := FileResponse{
		Type:     status,
		Filename: filename,
		Port:     port,
	}

	json, _ := json.Marshal(resp)

	remoteAddr, _ := net.ResolveUDPAddr("udp4", fmt.Sprintf("%s:%d", targetIp, FilePort))
	conn, _ := net.DialUDP("udp4", nil, remoteAddr)
	defer conn.Close()

	conn.Write(json)
}

func (p *PeerService) StartTCPFileReceiver(filename string, size int64) (int, error) {
	listener, err := net.Listen("tcp", ":0")
	if err != nil {
		return 0, err
	}

	port := listener.Addr().(*net.TCPAddr).Port
	fmt.Println("Listening for file on port:", port)

	go func() {
		defer listener.Close()

		conn, err := listener.Accept()
		if err != nil {
			fmt.Println("Error accepting file connection:", err)
			return
		}
		defer conn.Close()

		homeDir, _ := os.UserHomeDir()
		savePath := filepath.Join(homeDir, "Downloads", filepath.Base(filename))

		outFile, err := os.Create(savePath)
		if err != nil {
			fmt.Println("Error creating file:", err)
			return
		}
		defer outFile.Close()

		fmt.Println("Receiving file to:", savePath)

		buffer := make([]byte, 4096)
		var totalReceived int64

		for {
			n, err := conn.Read(buffer)
			if err != nil {
				if err == io.EOF {
					break
				}
				fmt.Println("Error reading from connection:", err)
				return
			}

			_, writeErr := outFile.Write(buffer[:n])
			if writeErr != nil {
				fmt.Println("Error writing to file:", writeErr)
				return
			}

			totalReceived += int64(n)

			percentage := 0.0
			if size > 0 {
				percentage = (float64(totalReceived) / float64(size)) * 100
			}

			if p.ctx != nil {
				runtime.EventsEmit(p.ctx, "file:progress", ProgressPayload{
					Filename:   filepath.Base(filename),
					Percentage: percentage,
					Type:       "download",
				})
			}
		}

		fmt.Println("File received successfully")
		if p.ctx != nil {
			runtime.EventsEmit(p.ctx, "file:complete", savePath)
		}
	}()

	return port, nil
}
