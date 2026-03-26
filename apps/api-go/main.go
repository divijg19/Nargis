package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"os"
	"sync"

	"github.com/gorilla/websocket"
)

// upgrader handles the HTTP to WebSocket protocol upgrade.
var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

// audioBuffer holds the raw audio data and a mutex for safe concurrent access.
type audioBuffer struct {
	buffer bytes.Buffer
	mu     sync.Mutex
}

// SttResponse defines the structure for the JSON response from our /stt endpoint.
type SttResponse struct {
	Text  string `json:"text"`
	Error string `json:"error"`
}

// LlmRequest defines the structure for the JSON request to our /llm endpoint.
type LlmRequest struct {
	Text string `json:"text"`
}

// handleConnections manages the WebSocket lifecycle for a connected client.
func handleConnections(w http.ResponseWriter, r *http.Request) {
	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("Failed to upgrade connection: %v", err)
		return
	}
	defer ws.Close()

	fmt.Println("Client Connected!")
	ab := &audioBuffer{}

	// Continuously read audio fragments and append them to the buffer.
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

	// After the client disconnects, process the complete audio stream.
	ab.mu.Lock()
	defer ab.mu.Unlock()

	if ab.buffer.Len() == 0 {
		log.Println("Buffer is empty, nothing to transcribe.")
		return
	}

	log.Printf("Sending complete %d byte audio stream to Python...", ab.buffer.Len())
	// This function now handles both STT and LLM calls.
	transcribeAndProcess(ab.buffer.Bytes())
}

// transcribeAndProcess orchestrates the two-step AI pipeline.
func transcribeAndProcess(audioData []byte) {
	// --- Step 1: Speech-to-Text ---
	sttURL := "http://localhost:8000/stt"
	sttBody := &bytes.Buffer{}
	sttWriter := multipart.NewWriter(sttBody)
	part, err := sttWriter.CreateFormFile("audio_file", "audio.webm")
	if err != nil {
		log.Printf("Error creating STT form file: %v", err)
		return
	}
	_, err = part.Write(audioData)
	if err != nil {
		log.Printf("Error writing audio data to form: %v", err)
		return
	}
	sttWriter.Close()

	sttReq, err := http.NewRequest("POST", sttURL, sttBody)
	if err != nil {
		log.Printf("Error creating STT request: %v", err)
		return
	}
	sttReq.Header.Set("Content-Type", sttWriter.FormDataContentType())

	client := &http.Client{}
	sttResp, err := client.Do(sttReq)
	if err != nil {
		log.Printf("Error sending STT request to Python: %v", err)
		return
	}
	defer sttResp.Body.Close()

	// Decode the JSON response from the STT service.
	var sttResponseData SttResponse
	if err := json.NewDecoder(sttResp.Body).Decode(&sttResponseData); err != nil {
		log.Printf("Error decoding STT JSON response: %v", err)
		return
	}

	// Check if the STT service returned a functional error.
	if sttResponseData.Error != "" {
		log.Printf("STT service returned an error: %s", sttResponseData.Error)
		return
	}

	transcribedText := sttResponseData.Text
	log.Printf("Transcription received: \"%s\"", transcribedText)

	if transcribedText == "" {
		log.Println("Transcription is empty, stopping pipeline.")
		return
	}

	// --- Step 2: Send Transcribed Text to LLM ---
	llmURL := "http://localhost:8000/llm"
	llmReqPayload := LlmRequest{Text: transcribedText}

	jsonPayload, err := json.Marshal(llmReqPayload)
	if err != nil {
		log.Printf("Error marshalling LLM request payload: %v", err)
		return
	}

	llmReq, err := http.NewRequest("POST", llmURL, bytes.NewBuffer(jsonPayload))
	if err != nil {
		log.Printf("Error creating LLM request: %v", err)
		return
	}
	llmReq.Header.Set("Content-Type", "application/json")

	log.Println("Sending text to LLM service...")
	llmResp, err := client.Do(llmReq)
	if err != nil {
		log.Printf("Error sending LLM request to Python: %v", err)
		return
	}
	defer llmResp.Body.Close()

	// Read and log the final LLM response.
	llmResponseBody, err := io.ReadAll(llmResp.Body)
	if err != nil {
		log.Printf("Error reading LLM response body: %v", err)
		return
	}

	log.Printf("Final LLM response received: %s", string(llmResponseBody))
}

// main starts the HTTP server.
func main() {
	// Create a new logger with a prefix for system events
	sysLog := log.New(os.Stdout, "[SYSTEM] ", log.LstdFlags)

	http.HandleFunc("/ws", handleConnections)
	sysLog.Println("Go WebSocket server starting on :8080") // Use the new logger
	err := http.ListenAndServe(":8080", nil)
	if err != nil {
		sysLog.Fatalf("ListenAndServe: %v", err)
	}
}
