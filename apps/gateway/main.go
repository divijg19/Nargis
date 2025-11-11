package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

type audioBuffer struct {
	buffer bytes.Buffer
	mu     sync.Mutex
}

func handleConnections(w http.ResponseWriter, r *http.Request) {
	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("Failed to upgrade connection: %v", err)
		return
	}
	defer ws.Close()

	log.Println("Client Connected!")
	ab := &audioBuffer{}

	for {
		messageType, p, err := ws.ReadMessage()
		if err != nil {
			log.Println("Read error (client likely disconnected):", err)
			break
		}

		if messageType == websocket.TextMessage && string(p) == "EOS" {
			log.Println("EOS received. Finalizing audio processing.")
			break
		}

		if messageType == websocket.BinaryMessage {
			ab.mu.Lock()
			ab.buffer.Write(p)
			ab.mu.Unlock()
		}
	}

	if ab.buffer.Len() == 0 {
		log.Println("Buffer is empty, nothing to process.")
		return
	}

	log.Printf("Sending complete %d byte audio stream to Python orchestrator...", ab.buffer.Len())
	processAudioPipeline(ab.buffer.Bytes(), ws)
}

// processAudioPipeline sends the complete audio data to the Python AI service
// and relays the final response back to the client.
func processAudioPipeline(audioData []byte, ws *websocket.Conn) {
	orchestratorBaseURL := os.Getenv("ORCHESTRATOR_URL")
	if orchestratorBaseURL == "" {
		// This default is now correct for the local dev workflow.
		orchestratorBaseURL = "http://localhost:8000"
	}
	pipelineURL := strings.TrimRight(orchestratorBaseURL, "/") + "/api/v1/process-audio"

	// Generate a request ID for tracing and add to outbound request headers and logs.
	requestID := uuid.New().String()

	// Increased timeout to be more forgiving during the first AI model load.
	client := &http.Client{Timeout: 120 * time.Second}
	var resp *http.Response
	var reqErr error

	for attempt := 1; attempt <= 3; attempt++ {
		// --- THIS IS THE CRITICAL FIX ---
		// The request body and the request itself are now created *inside* the loop.
		// This ensures the audioData buffer is fresh and readable for every single retry attempt.
		body := &bytes.Buffer{}
		writer := multipart.NewWriter(body)
		part, err := writer.CreateFormFile("audio_file", "audio.webm")
		if err != nil {
			log.Printf("Error creating form file (attempt %d): %v", attempt, err)
			continue // Go to the next attempt
		}
		if _, err := part.Write(audioData); err != nil {
			log.Printf("Error writing audio data (attempt %d): %v", attempt, err)
			continue
		}
		writer.Close()

		req, err := http.NewRequest("POST", pipelineURL, body)
		if err != nil {
			log.Printf("[RequestID: %s] Error creating HTTP request (attempt %d): %v", requestID, attempt, err)
			continue
		}
		req.Header.Set("Content-Type", writer.FormDataContentType())

		// Forward the generated Request ID for downstream correlation
		req.Header.Set("X-Request-ID", requestID)

		log.Printf("[RequestID: %s] Sending request to Python API (Attempt %d)...", requestID, attempt)
		resp, reqErr = client.Do(req)

		// If there was no error and we got a non-server-error response, break the loop.
		if reqErr == nil && resp.StatusCode < 500 {
			break
		}
		log.Printf("API request attempt %d failed: %v", attempt, reqErr)
		time.Sleep(time.Duration(attempt) * 500 * time.Millisecond) // Exponential backoff
	}

	if reqErr != nil {
		log.Printf("[RequestID: %s] Error sending request to Python API after retries: %v", requestID, reqErr)
		errMsg := fmt.Sprintf(`{"error":"orchestrator_unavailable", "detail":"%v"}`, reqErr)
		_ = ws.WriteMessage(websocket.TextMessage, []byte(errMsg))
		return
	}
	defer resp.Body.Close()

	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Printf("Error reading response body from Python API: %v", err)
		return
	}

	if resp.StatusCode != http.StatusOK {
		log.Printf("[RequestID: %s] Python API returned a non-200 status: %d. Body: %s", requestID, resp.StatusCode, string(responseBody))
		_ = ws.WriteMessage(websocket.TextMessage, responseBody) // Forward the error details to the client.
		return
	}

	log.Printf("[RequestID: %s] Final LLM response received: %s", requestID, string(responseBody))
	log.Printf("[RequestID: %s] Sending response back to client...", requestID)
	if err := ws.WriteMessage(websocket.TextMessage, responseBody); err != nil {
		log.Printf("[RequestID: %s] Error writing message back to client: %v", requestID, err)
	}
}

func healthHandler(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	_, _ = w.Write([]byte(`{"status":"ok"}`))
}

func readyHandler(w http.ResponseWriter, _ *http.Request) {
	orchestratorURL := os.Getenv("ORCHESTRATOR_URL")
	w.Header().Set("Content-Type", "application/json")
	payload := map[string]string{
		"status":          "ready",
		"orchestratorUrl": orchestratorURL,
		"time":            time.Now().UTC().Format(time.RFC3339),
	}
	b, _ := json.Marshal(payload)
	_, _ = w.Write(b)
}

func main() {
	if len(os.Args) > 1 && os.Args[1] == "--healthcheck" {
		fmt.Println("ok")
		return
	}

	sysLog := log.New(os.Stdout, "[SYSTEM] ", log.LstdFlags)
	mux := http.NewServeMux()

	mux.HandleFunc("/ws", handleConnections)
	mux.HandleFunc("/health", healthHandler)
	mux.HandleFunc("/ready", readyHandler)

	sysLog.Println("Go WebSocket Gateway starting on :8080")

	server := &http.Server{
		Addr:    ":8080",
		Handler: mux,
	}

	// Run server in a goroutine so we can listen for shutdown signals.
	go func() {
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			sysLog.Fatalf("ListenAndServe error: %v", err)
		}
	}()

	// Wait for interrupt signal to gracefully shutdown the server with a timeout.
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	sysLog.Println("Shutdown signal received, shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := server.Shutdown(ctx); err != nil {
		sysLog.Fatalf("Server forced to shutdown: %v", err)
	}
	sysLog.Println("Server exited gracefully")
}
