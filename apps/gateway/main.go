package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"net"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"sync"
	"sync/atomic"
	"syscall"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	// lightweight internal metrics (avoids external dependencies in vendor mode)
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

// CircuitBreaker is a tiny lock-free circuit breaker.
type CircuitBreaker struct {
	failures   int32
	openUntil  int64 // unix nanos
	threshold  int32
	openWindow time.Duration
}

func NewCircuitBreaker(threshold int32, openWindow time.Duration) *CircuitBreaker {
	return &CircuitBreaker{threshold: threshold, openWindow: openWindow}
}

func (cb *CircuitBreaker) Allow() bool {
	now := time.Now().UnixNano()
	open := atomic.LoadInt64(&cb.openUntil)
	return now >= open
}

func (cb *CircuitBreaker) Success() {
	atomic.StoreInt32(&cb.failures, 0)
}

func (cb *CircuitBreaker) Failure() {
	f := atomic.AddInt32(&cb.failures, 1)
	if f >= cb.threshold {
		// open the circuit
		atomic.StoreInt64(&cb.openUntil, time.Now().Add(cb.openWindow).UnixNano())
		atomic.StoreInt32(&cb.failures, 0)
	}
}

// global circuit breaker instance used for orchestrator calls
var orchestratorCB = NewCircuitBreaker(5, 5*time.Second)

// Simple per-IP token bucket rate limiter
type TokenBucket struct {
	mu     sync.Mutex
	tokens float64
	last   time.Time
}

func (tb *TokenBucket) Allow(rate float64, burst float64) bool {
	tb.mu.Lock()
	defer tb.mu.Unlock()
	now := time.Now()
	if tb.last.IsZero() {
		tb.last = now
		tb.tokens = burst
	}
	elapsed := now.Sub(tb.last).Seconds()
	tb.tokens += elapsed * rate
	if tb.tokens > burst {
		tb.tokens = burst
	}
	tb.last = now
	if tb.tokens >= 1.0 {
		tb.tokens -= 1.0
		return true
	}
	return false
}

var ipBuckets sync.Map // map[string]*TokenBucket

// Prometheus metrics
// Internal metrics (simple, exported as JSON on /metrics)
type Metrics struct {
	mu             sync.Mutex
	OrchRequests   int64
	OrchFailures   int64
	OrchLatencySum float64
	OrchLatencyCnt int64
	RateLimited    int64
}

var metrics = &Metrics{}

func (m *Metrics) IncRequests() {
	atomic.AddInt64(&m.OrchRequests, 1)
}

func (m *Metrics) IncFailures() {
	atomic.AddInt64(&m.OrchFailures, 1)
}

func (m *Metrics) ObserveLatency(d float64) {
	m.mu.Lock()
	m.OrchLatencySum += d
	m.OrchLatencyCnt++
	m.mu.Unlock()
}

func (m *Metrics) IncRateLimited() {
	atomic.AddInt64(&m.RateLimited, 1)
}

func handleConnections(w http.ResponseWriter, r *http.Request) {
	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("Failed to upgrade connection: %v", err)
		return
	}
	defer ws.Close()

	log.Println("Client Connected! (streaming mode)")

	orchestratorBaseURL := os.Getenv("ORCHESTRATOR_URL")
	if orchestratorBaseURL == "" {
		orchestratorBaseURL = "http://localhost:8000"
	}
	pipelineURL := strings.TrimRight(orchestratorBaseURL, "/") + "/api/v1/process-audio"

	// Generate request ID and HTTP client
	requestID := uuid.New().String()
	client := &http.Client{Timeout: 120 * time.Second}

	// Create a pipe that will stream multipart data into the HTTP request body
	pr, pw := io.Pipe()
	mw := multipart.NewWriter(pw)

	// Create the form file part that will receive binary chunks
	part, err := mw.CreateFormFile("audio_file", "audio.webm")
	if err != nil {
		log.Printf("Failed to create multipart part: %v", err)
		_ = ws.WriteMessage(websocket.TextMessage, []byte(`{"error":"server_internal","detail":"multipart init failed"}`))
		return
	}

	// Prepare the HTTP request that will stream the body from the pipe reader
	req, err := http.NewRequest("POST", pipelineURL, pr)
	if err != nil {
		log.Printf("Error creating streaming HTTP request: %v", err)
		_ = ws.WriteMessage(websocket.TextMessage, []byte(`{"error":"server_internal","detail":"request create failed"}`))
		return
	}
	req.Header.Set("Content-Type", mw.FormDataContentType())
	req.Header.Set("X-Request-ID", requestID)

	// Start the request in a goroutine so it consumes the pipe as we write to it.
	respCh := make(chan *http.Response, 1)
	errCh := make(chan error, 1)
	go func() {
		resp, err := client.Do(req)
		if err != nil {
			errCh <- err
			return
		}
		respCh <- resp
	}()

	// Read websocket messages and stream audio binary into the multipart part.
	for {
		messageType, p, err := ws.ReadMessage()
		if err != nil {
			log.Printf("Read error (client likely disconnected): %v", err)
			// Propagate the error to the pipe so the HTTP client doesn't hang.
			_ = pw.CloseWithError(err)
			return
		}

		if messageType == websocket.TextMessage && string(p) == "EOS" {
			log.Println("EOS received. Finalizing streaming to orchestrator.")
			break
		}

		if messageType == websocket.BinaryMessage {
			// Write chunk to multipart part; this will flow through the pipe to the HTTP client.
			if _, werr := part.Write(p); werr != nil {
				log.Printf("Error writing chunk to multipart part: %v", werr)
				_ = pw.CloseWithError(werr)
				return
			}
		}
	}

	// Close the multipart writer to finish the form and then close the pipe writer.
	if err := mw.Close(); err != nil {
		log.Printf("Error closing multipart writer: %v", err)
		_ = pw.CloseWithError(err)
		return
	}
	_ = pw.Close()

	// Wait for response or error
	select {
	case err := <-errCh:
		log.Printf("[RequestID: %s] Error sending streaming request: %v", requestID, err)
		_ = ws.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf(`{"error":"orchestrator_unavailable","detail":"%v"}`, err)))
		return
	case resp := <-respCh:
		defer resp.Body.Close()
		responseBody, rerr := io.ReadAll(resp.Body)
		if rerr != nil {
			log.Printf("[RequestID: %s] Error reading response body: %v", requestID, rerr)
			_ = ws.WriteMessage(websocket.TextMessage, []byte(`{"error":"read_response_failed"}`))
			return
		}

		if resp.StatusCode != http.StatusOK {
			log.Printf("[RequestID: %s] Orchestrator returned non-200: %d body:%s", requestID, resp.StatusCode, string(responseBody))
			_ = ws.WriteMessage(websocket.TextMessage, responseBody)
			return
		}

		log.Printf("[RequestID: %s] Streaming LLM response received: %s", requestID, string(responseBody))
		if err := ws.WriteMessage(websocket.TextMessage, responseBody); err != nil {
			log.Printf("[RequestID: %s] Error writing message back to client: %v", requestID, err)
		}
	case <-time.After(130 * time.Second):
		log.Printf("[RequestID: %s] Timeout waiting for orchestrator response", requestID)
		_ = ws.WriteMessage(websocket.TextMessage, []byte(`{"error":"orchestrator_timeout"}`))
		return
	}
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

	// Fast-fail if circuit is open
	if !orchestratorCB.Allow() {
		log.Printf("[RequestID: %s] Circuit open: fast-failing request to orchestrator", requestID)
		errMsg := `{"error":"orchestrator_unavailable","detail":"circuit_open"}`
		_ = ws.WriteMessage(websocket.TextMessage, []byte(errMsg))
		return
	}

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

		// Record success/failure in circuit breaker
		if reqErr != nil {
			orchestratorCB.Failure()
		} else if resp.StatusCode >= 500 {
			orchestratorCB.Failure()
		} else {
			orchestratorCB.Success()
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

	// Probe orchestrator /ready if configured to include its readiness in our response.
	orchestratorStatus := "unknown"
	if orchestratorURL != "" {
		client := &http.Client{Timeout: 3 * time.Second}
		readyURL := strings.TrimRight(orchestratorURL, "/") + "/ready"
		resp, err := client.Get(readyURL)
		if err != nil {
			orchestratorStatus = "unreachable"
		} else {
			defer resp.Body.Close()
			if resp.StatusCode == http.StatusOK {
				orchestratorStatus = "ready"
			} else {
				orchestratorStatus = fmt.Sprintf("degraded(%d)", resp.StatusCode)
			}
		}
	}

	payload := map[string]string{
		"status":          "ready",
		"orchestratorUrl": orchestratorURL,
		"orchestrator":    orchestratorStatus,
		"time":            time.Now().UTC().Format(time.RFC3339),
	}
	b, _ := json.Marshal(payload)
	_, _ = w.Write(b)
}

// proxyProcessAudioHandler accepts a multipart upload and forwards it to the
// configured Python orchestrator. This lets external clients POST to the Go
// gateway instead of calling the orchestrator directly while benefiting from
// the gateway's retry and tracing logic.
func proxyProcessAudioHandler(w http.ResponseWriter, r *http.Request) {
	orchestratorBaseURL := os.Getenv("ORCHESTRATOR_URL")
	if orchestratorBaseURL == "" {
		http.Error(w, "orchestrator not configured", http.StatusServiceUnavailable)
		return
	}
	pipelineURL := strings.TrimRight(orchestratorBaseURL, "/") + "/api/v1/process-audio"

	// Rate-limit per-IP (token bucket)
	host := r.RemoteAddr
	if h, _, err := net.SplitHostPort(r.RemoteAddr); err == nil {
		host = h
	}
	v, _ := ipBuckets.LoadOrStore(host, &TokenBucket{})
	tb := v.(*TokenBucket)
	// allow: 1 token/sec, burst 5
	if !tb.Allow(1.0, 5.0) {
		metrics.IncRateLimited()
		http.Error(w, "rate limited", http.StatusTooManyRequests)
		return
	}

	// Fast-fail if orchestrator circuit is open
	if !orchestratorCB.Allow() {
		http.Error(w, "orchestrator unavailable (circuit open)", http.StatusServiceUnavailable)
		return
	}

	// Single streaming attempt: forward the incoming body directly to the orchestrator.
	requestID := uuid.New().String()
	req, err := http.NewRequest("POST", pipelineURL, r.Body)
	if err != nil {
		http.Error(w, "failed to create request", http.StatusInternalServerError)
		return
	}
	if ct := r.Header.Get("Content-Type"); ct != "" {
		req.Header.Set("Content-Type", ct)
	}
	req.Header.Set("X-Request-ID", requestID)

	client := &http.Client{Timeout: 120 * time.Second}

	metrics.IncRequests()
	start := time.Now()
	resp, err := client.Do(req)
	dur := time.Since(start).Seconds()
	metrics.ObserveLatency(dur)
	if err != nil {
		metrics.IncFailures()
		orchestratorCB.Failure()
		http.Error(w, fmt.Sprintf("failed to forward to orchestrator: %v", err), http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 500 {
		metrics.IncFailures()
		orchestratorCB.Failure()
	} else {
		orchestratorCB.Success()
	}

	// Relay status and body back to caller.
	w.WriteHeader(resp.StatusCode)
	if _, err := io.Copy(w, resp.Body); err != nil {
		log.Printf("[Proxy %s] Error copying response body: %v", requestID, err)
	}
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
	// Expose simple JSON metrics for monitoring
	mux.HandleFunc("/metrics", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		metrics.mu.Lock()
		avg := 0.0
		if metrics.OrchLatencyCnt > 0 {
			avg = metrics.OrchLatencySum / float64(metrics.OrchLatencyCnt)
		}
		payload := map[string]interface{}{
			"orchestrator_requests_total": metrics.OrchRequests,
			"orchestrator_failures_total": metrics.OrchFailures,
			"orchestrator_latency_avg_s":  avg,
			"rate_limited_total":          metrics.RateLimited,
		}
		metrics.mu.Unlock()
		b, _ := json.Marshal(payload)
		_, _ = w.Write(b)
	})
	mux.HandleFunc("/proxy/process-audio", proxyProcessAudioHandler)

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
