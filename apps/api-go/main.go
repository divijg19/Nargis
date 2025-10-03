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
	"strings"
	"sync"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

type audioBuffer struct {
	buffer bytes.Buffer
	mu     sync.Mutex
}

type SttResponse struct {
	Text  string `json:"text"`
	Error string `json:"error"`
}

type LlmRequest struct {
	Text string `json:"text"`
}

func handleConnections(w http.ResponseWriter, r *http.Request) {
	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("Failed to upgrade connection: %v", err)
		return
	}
	defer ws.Close()

	fmt.Println("Client Connected!")
	ab := &audioBuffer{}

	// --- THIS IS THE CRITICAL FIX #3 ---
	for {
		messageType, p, err := ws.ReadMessage()
		if err != nil {
			log.Println("Read error (client disconnected prematurely):", err)
			break
		}

		if messageType == websocket.TextMessage && string(p) == "EOS" {
			log.Println("EOS received. Finalizing transcription.")
			break // Exit the loop cleanly
		}

		if messageType == websocket.BinaryMessage {
			ab.mu.Lock()
			ab.buffer.Write(p)
			ab.mu.Unlock()
		}
	}

	if ab.buffer.Len() == 0 {
		log.Println("Buffer is empty, nothing to transcribe.")
		return
	}

	log.Printf("Sending complete %d byte audio stream to Python...", ab.buffer.Len())
	transcribeAndProcess(ab.buffer.Bytes(), ws)
}

func transcribeAndProcess(audioData []byte, ws *websocket.Conn) {
	// Resolve backend URLs from environment for production deploys.
	// STT_URL and LLM_URL should be set to the Python service base (e.g. https://api.example.com)
	sttBase := os.Getenv("STT_URL")
	if sttBase == "" {
		sttBase = "http://localhost:8000"
	}
	sttURL := strings.TrimRight(sttBase, "/") + "/stt"
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
	var sttResponseData SttResponse
	if err := json.NewDecoder(sttResp.Body).Decode(&sttResponseData); err != nil {
		log.Printf("Error decoding STT JSON response: %v", err)
		return
	}
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
	llmBase := os.Getenv("LLM_URL")
	if llmBase == "" {
		llmBase = sttBase
	}
	llmURL := strings.TrimRight(llmBase, "/") + "/llm"
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
	llmResponseBody, err := io.ReadAll(llmResp.Body)
	if err != nil {
		log.Printf("Error reading LLM response body: %v", err)
		return
	}
	log.Printf("Final LLM response received: %s", string(llmResponseBody))
	log.Println("Sending response back to client...")
	if err := ws.WriteMessage(websocket.TextMessage, llmResponseBody); err != nil {
		log.Printf("Error writing message back to client: %v", err)
	}
}

func main() {
	sysLog := log.New(os.Stdout, "[SYSTEM] ", log.LstdFlags)
	http.HandleFunc("/ws", handleConnections)
	sysLog.Println("Go WebSocket server starting on :8080")
	err := http.ListenAndServe(":8080", nil)
	if err != nil {
		sysLog.Fatalf("ListenAndServe: %v", err)
	}
}
