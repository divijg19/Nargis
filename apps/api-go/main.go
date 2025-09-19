package main

import (
	"bytes"
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

// audioBuffer is simple again: just a buffer and a mutex.
type audioBuffer struct {
	buffer bytes.Buffer
	mu     sync.Mutex
}

func handleConnections(w http.ResponseWriter, r *http.Request) {
	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Fatal(err)
	}
	defer ws.Close()

	fmt.Println("Client Connected!")

	// Create one buffer for the entire connection.
	ab := &audioBuffer{}

	// Read all incoming messages and append them to the buffer.
	for {
		_, p, err := ws.ReadMessage()
		if err != nil {
			log.Println("Client disconnected. Finalizing transcription.")
			break // Exit the loop when the client closes the connection.
		}

		ab.mu.Lock()
		ab.buffer.Write(p)
		ab.mu.Unlock()
	}

	// --- PROCESS THE AUDIO AFTER THE CONNECTION CLOSES ---
	// At this point, the user has clicked "Stop Recording".
	// The buffer now contains the complete audio stream from start to finish.
	ab.mu.Lock()
	defer ab.mu.Unlock()

	if ab.buffer.Len() == 0 {
		log.Println("Buffer is empty, nothing to transcribe.")
		return
	}

	log.Printf("Sending complete %d byte audio stream to Python...", ab.buffer.Len())
	// Send the entire, complete audio stream for transcription.
	sendToPython(ab.buffer.Bytes())
}

// sendToPython is unchanged and correct.
func sendToPython(audioData []byte) {
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, err := writer.CreateFormFile("audio_file", "audio.webm")
	if err != nil {
		log.Println("Error creating form file:", err)
		return
	}
	_, err = part.Write(audioData)
	if err != nil {
		log.Println("Error writing audio data:", err)
		return
	}
	writer.Close()

	req, err := http.NewRequest("POST", "http://localhost:8000/stt", body)
	if err != nil {
		log.Println("Error creating request:", err)
		return
	}
	req.Header.Set("Content-Type", writer.FormDataContentType())

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		log.Println("Error sending request to Python:", err)
		return
	}
	defer resp.Body.Close()

	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Println("Error reading Python response:", err)
		return
	}

	log.Printf("Transcription received from Python: %s", string(responseBody))
}

func main() {
	http.HandleFunc("/ws", handleConnections)
	log.Println("Go WebSocket server starting on :8080")
	err := http.ListenAndServe(":8080", nil)
	if err != nil {
		log.Fatal("ListenAndServe: ", err)
	}
}
