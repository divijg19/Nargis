package main

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"net"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"syscall"
	"time"

	"bufio"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

// The upgrader uses a custom origin check that consults WS_ALLOWED_ORIGINS.
// If WS_ALLOWED_ORIGINS is empty, the gateway will accept all origins (useful for local dev).
var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return checkOrigin(r) },
}

// checkOrigin consults WS_ALLOWED_ORIGINS (comma-separated). If empty, allow all.
func checkOrigin(r *http.Request) bool {
	allowed := os.Getenv("WS_ALLOWED_ORIGINS")
	if strings.TrimSpace(allowed) == "" {
		// No restriction configured; allow (but log in debug scenarios)
		return true
	}
	origin := r.Header.Get("Origin")
	if origin == "" {
		// No Origin header; be conservative and reject
		return false
	}
	// compare against comma-separated list
	for _, o := range strings.Split(allowed, ",") {
		o = strings.TrimSpace(o)
		if o == "" {
			continue
		}
		if strings.EqualFold(o, origin) {
			return true
		}
	}
	return false
}

// verifyJWT optionally validates a JWT using HS256 when JWT_HMAC_SECRET is set.
// If no secret is configured, JWT validation is a no-op and returns ("", nil).
// On success it returns the resolved user id to propagate downstream (sub/user_id/uid).
func verifyJWT(r *http.Request) (string, error) {
	secret := os.Getenv("JWT_HMAC_SECRET")
	if strings.TrimSpace(secret) == "" {
		// JWT validation not enabled
		return "", nil
	}

	auth := r.Header.Get("Authorization")
	if auth == "" {
		return "", nil
	}
	if !strings.HasPrefix(auth, "Bearer ") {
		return "", errors.New("invalid authorization header")
	}
	token := strings.TrimPrefix(auth, "Bearer ")
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return "", errors.New("invalid token format")
	}

	signingInput := parts[0] + "." + parts[1]
	sig, err := base64.RawURLEncoding.DecodeString(parts[2])
	if err != nil {
		return "", fmt.Errorf("invalid signature encoding: %w", err)
	}

	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(signingInput))
	expected := mac.Sum(nil)
	if !hmac.Equal(sig, expected) {
		return "", errors.New("invalid token signature")
	}

	payload, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return "", fmt.Errorf("invalid payload encoding: %w", err)
	}
	var claims map[string]interface{}
	if err := json.Unmarshal(payload, &claims); err != nil {
		return "", fmt.Errorf("invalid payload json: %w", err)
	}

	// Prefer standard `sub`, then `user_id`, then `uid`.
	if sub, ok := claims["sub"].(string); ok && sub != "" {
		return sub, nil
	}
	if uid, ok := claims["user_id"].(string); ok && uid != "" {
		return uid, nil
	}
	if uidf, ok := claims["uid"].(float64); ok {
		return fmt.Sprintf("%.0f", uidf), nil
	}
	return "", nil
}

// parseJWTClaims verifies the Authorization: Bearer <token> header (if present)
// using the same HS256 secret and returns the decoded claims map. If no
// token or secret is configured this returns (nil, nil). On verification
// error an error is returned.
func parseJWTClaims(r *http.Request) (map[string]interface{}, error) {
	secret := os.Getenv("JWT_HMAC_SECRET")
	if strings.TrimSpace(secret) == "" {
		return nil, nil
	}
	auth := r.Header.Get("Authorization")
	if auth == "" {
		return nil, nil
	}
	if !strings.HasPrefix(auth, "Bearer ") {
		return nil, errors.New("invalid authorization header")
	}
	token := strings.TrimPrefix(auth, "Bearer ")
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return nil, errors.New("invalid token format")
	}
	signingInput := parts[0] + "." + parts[1]
	sig, err := base64.RawURLEncoding.DecodeString(parts[2])
	if err != nil {
		return nil, fmt.Errorf("invalid signature encoding: %w", err)
	}
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(signingInput))
	expected := mac.Sum(nil)
	if !hmac.Equal(sig, expected) {
		return nil, errors.New("invalid token signature")
	}
	payload, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return nil, fmt.Errorf("invalid payload encoding: %w", err)
	}
	var claims map[string]interface{}
	if err := json.Unmarshal(payload, &claims); err != nil {
		return nil, fmt.Errorf("invalid payload json: %w", err)
	}
	return claims, nil
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
// cbMap holds CircuitBreaker instances keyed by backend URL (or logical key).
var cbMap sync.Map // map[string]*CircuitBreaker

// getCircuitBreaker returns the CircuitBreaker for a given key, creating it
// with defaults if missing. Threshold and openWindow can be tuned via env
// variables ORCH_CB_THRESHOLD and ORCH_CB_OPEN_WINDOW_SECONDS.
func getCircuitBreaker(key string) *CircuitBreaker {
	if v, ok := cbMap.Load(key); ok {
		return v.(*CircuitBreaker)
	}
	// defaults
	threshold := int32(5)
	openWindow := 5 * time.Second
	if t := strings.TrimSpace(os.Getenv("ORCH_CB_THRESHOLD")); t != "" {
		if parsed, err := strconv.Atoi(t); err == nil && parsed > 0 {
			threshold = int32(parsed)
		}
	}
	if s := strings.TrimSpace(os.Getenv("ORCH_CB_OPEN_WINDOW_SECONDS")); s != "" {
		if parsed, err := strconv.Atoi(s); err == nil && parsed > 0 {
			openWindow = time.Duration(parsed) * time.Second
		}
	}
	cb := NewCircuitBreaker(threshold, openWindow)
	actual, _ := cbMap.LoadOrStore(key, cb)
	return actual.(*CircuitBreaker)
}

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

// ipCache implements a simple TTL-evicting cache for per-IP token buckets.
// It stores a TokenBucket and the last seen timestamp. A background goroutine
// periodically cleans up entries older than the configured TTL.
type ipEntry struct {
	tb   *TokenBucket
	last time.Time
}

var ipCache = struct {
	mu sync.RWMutex
	m  map[string]*ipEntry
}{m: make(map[string]*ipEntry)}

// getTokenBucket returns the TokenBucket for a host, creating it if missing
// and updating the last-seen timestamp.
func getTokenBucket(host string) *TokenBucket {
	ipCache.mu.Lock()
	defer ipCache.mu.Unlock()
	e, ok := ipCache.m[host]
	if !ok {
		e = &ipEntry{tb: &TokenBucket{tokens: 0, last: time.Time{}}, last: time.Now()}
		ipCache.m[host] = e
		return e.tb
	}
	e.last = time.Now()
	return e.tb
}

// startIPCacheEvictor starts a background goroutine that removes entries
// not seen within ttl minutes. Call once from main() before starting server.
func startIPCacheEvictor() {
	ttlMin := 10
	if v := strings.TrimSpace(os.Getenv("IP_BUCKET_TTL_MINUTES")); v != "" {
		if parsed, err := strconv.Atoi(v); err == nil && parsed > 0 {
			ttlMin = parsed
		}
	}
	ttl := time.Duration(ttlMin) * time.Minute
	ticker := time.NewTicker(1 * time.Minute)
	go func() {
		for range ticker.C {
			cutoff := time.Now().Add(-ttl)
			ipCache.mu.Lock()
			removed := 0
			for k, v := range ipCache.m {
				if v.last.Before(cutoff) {
					delete(ipCache.m, k)
					removed++
				}
			}
			// update evictions counter once per cleanup
			ipCache.mu.Unlock()
			if removed > 0 {
				// record eviction metric in our local metrics struct as well
				for i := 0; i < removed; i++ {
					metrics.IncIPCacheEvictions()
				}
			}
		}
	}()
}

// Prometheus metrics
// Internal metrics (simple, exported as JSON on /metrics)
type Metrics struct {
	mu             sync.Mutex
	OrchRequests   int64
	OrchFailures   int64
	OrchLatencySum float64
	OrchLatencyCnt int64
	RateLimited    int64
	// IPCacheEvictions counts how many ip cache entries have been evicted.
	IPCacheEvictions int64
}

var metrics = &Metrics{}

// Prometheus instrumentation (optional)
// If PROMETHEUS_ENABLED=1 we expose a Prometheus-format endpoint that is
// generated from our internal metrics (no vendor dependency required).
var prometheusEnabled = strings.TrimSpace(os.Getenv("PROMETHEUS_ENABLED")) == "1"

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

func (m *Metrics) IncIPCacheEvictions() {
	atomic.AddInt64(&m.IPCacheEvictions, 1)
}

func handleConnections(w http.ResponseWriter, r *http.Request) {
	// Optional JWT validation at upgrade time.
	// If WS_REQUIRE_AUTH=1 then a valid token must be presented in the
	// Authorization header; otherwise we accept unauthenticated connections.
	preAuthUserID := ""
	if strings.TrimSpace(os.Getenv("WS_REQUIRE_AUTH")) == "1" {
		uid, verr := verifyJWT(r)
		if verr != nil || uid == "" {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		preAuthUserID = uid
	} else {
		// If auth is not required, still attempt to extract the identity if
		// present but ignore any verification errors.
		if uid, _ := verifyJWT(r); uid != "" {
			preAuthUserID = uid
		}
	}

	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("Failed to upgrade connection: %v", err)
		return
	}
	defer ws.Close()

	// Use the pre-upgrade extracted user id (if any) so it can be propagated
	// downstream without needing to re-parse the Authorization header after
	// the upgrade.
	userID := preAuthUserID

	// Attempt to extract full claims so we can forward them downstream in a
	// compact header. If claims are present we'll JSON-encode and base64 them
	// to keep the header value safe.
	var userClaimsEncoded string
	if claims, err := parseJWTClaims(r); err == nil && claims != nil {
		if cj, err := json.Marshal(claims); err == nil {
			userClaimsEncoded = base64.RawURLEncoding.EncodeToString(cj)
		}
	}

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

	// Prepare a cancelable context derived from the request for upstream cancellation
	ctx, cancel := context.WithCancel(r.Context())
	defer cancel()

	// Prepare the HTTP request that will stream the body from the pipe reader
	req, err := http.NewRequestWithContext(ctx, "POST", pipelineURL, pr)
	if err != nil {
		log.Printf("Error creating streaming HTTP request: %v", err)
		_ = ws.WriteMessage(websocket.TextMessage, []byte(`{"error":"server_internal","detail":"request create failed"}`))
		return
	}
	req.Header.Set("Content-Type", mw.FormDataContentType())
	req.Header.Set("X-Request-ID", requestID)
	if userID != "" {
		req.Header.Set("X-User-ID", userID)
	}
	if userClaimsEncoded != "" {
		req.Header.Set("X-User-Claims", userClaimsEncoded)
	}

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

	// Opt-in buffered fallback: if ENABLE_BUFFERED_FALLBACK=1 then collect all
	// binary messages into memory and call the legacy `processAudioPipeline`
	// helper. This preserves the previous buffered path and ensures the
	// function is referenced (avoids unusedfunc diagnostics) while keeping the
	// default path streaming and memory-efficient.
	if strings.TrimSpace(os.Getenv("ENABLE_BUFFERED_FALLBACK")) == "1" {
		log.Println("Buffered fallback enabled: accumulating audio into memory")
		var buf bytes.Buffer
		for {
			messageType, p, err := ws.ReadMessage()
			if err != nil {
				log.Printf("Read error (client likely disconnected): %v", err)
				// If error, close connection and exit
				return
			}
			if messageType == websocket.TextMessage && string(p) == "EOS" {
				log.Println("EOS received. Calling buffered processAudioPipeline.")
				// Call the existing helper which will perform retries and reply
				processAudioPipeline(buf.Bytes(), ws)
				return
			}
			if messageType == websocket.BinaryMessage {
				if _, werr := buf.Write(p); werr != nil {
					log.Printf("Error buffering chunk: %v", werr)
					return
				}
			}
		}
	}

	canceled := false
	// Read websocket messages and stream audio binary into the multipart part.
	for {
		messageType, p, err := ws.ReadMessage()
		if err != nil {
			log.Printf("Read error (client likely disconnected): %v", err)
			// Propagate the error to the pipe so the HTTP client doesn't hang.
			_ = pw.CloseWithError(err)
			cancel()
			return
		}

		if messageType == websocket.TextMessage {
			if string(p) == "EOS" {
				log.Println("EOS received. Finalizing streaming to orchestrator.")
				break
			}
			if string(p) == "STOP" {
				log.Println("STOP received. Canceling upstream request and closing stream.")
				canceled = true
				// Cancel upstream and close multipart writer to unblock HTTP client
				cancel()
				_ = pw.CloseWithError(fmt.Errorf("client stop"))
				break
			}
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

		// If upstream returned non-200, forward an initial error frame but continue streaming body if present.
		if resp.StatusCode != http.StatusOK {
			msg := fmt.Sprintf(`{"type":"error","status":%d}`, resp.StatusCode)
			_ = ws.WriteMessage(websocket.TextMessage, []byte(msg))
			// continue to stream NDJSON lines below (useful if Python streams error details)
		}

		// Stream NDJSON / line-oriented events from Python to the websocket client.
		scanner := bufio.NewScanner(resp.Body)
		// Increase the scanner buffer to safely handle longer NDJSON lines
		buf := make([]byte, 0, 64*1024)
		scanner.Buffer(buf, 1<<20) // up to ~1MB lines
		for scanner.Scan() {
			line := scanner.Bytes() // raw bytes of the line (without newline)
			if err := ws.WriteMessage(websocket.TextMessage, line); err != nil {
				log.Printf("[RequestID: %s] Failed to write ws message: %v", requestID, err)
				return
			}
		}
		if err := scanner.Err(); err != nil {
			log.Printf("[RequestID: %s] Error scanning Python stream: %v", requestID, err)
			_ = ws.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf(`{"type":"error","content":"%s"}`, err.Error())))
			return
		}
		// EOF reached normally; signal end-of-stream optionally
		if canceled {
			_ = ws.WriteMessage(websocket.TextMessage, []byte(`{"type":"end","content":"canceled"}`))
		} else {
			_ = ws.WriteMessage(websocket.TextMessage, []byte(`{"type":"end","content":"stream_closed"}`))
		}
		return
	case <-time.After(130 * time.Second):
		log.Printf("[RequestID: %s] Timeout waiting for orchestrator response", requestID)
		_ = ws.WriteMessage(websocket.TextMessage, []byte(`{"error":"orchestrator_timeout"}`))
		return
	case <-ctx.Done():
		// Upstream was canceled before we received a response body
		log.Printf("[RequestID: %s] Upstream request canceled.", requestID)
		_ = ws.WriteMessage(websocket.TextMessage, []byte(`{"type":"end","content":"canceled"}`))
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

	// Fast-fail if circuit is open (per-backend)
	if !getCircuitBreaker(pipelineURL).Allow() {
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
			getCircuitBreaker(pipelineURL).Failure()
		} else if resp.StatusCode >= 500 {
			getCircuitBreaker(pipelineURL).Failure()
		} else {
			getCircuitBreaker(pipelineURL).Success()
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

	// Stream NDJSON / line-oriented events from Python to the websocket client.
	if resp.StatusCode != http.StatusOK {
		// send an initial error frame but continue streaming body if present
		msg := fmt.Sprintf(`{"type":"error","status":%d}`, resp.StatusCode)
		_ = ws.WriteMessage(websocket.TextMessage, []byte(msg))
	}
	scanner := bufio.NewScanner(resp.Body)
	// Increase the scanner buffer to safely handle longer NDJSON lines
	buf := make([]byte, 0, 64*1024)
	scanner.Buffer(buf, 1<<20) // up to ~1MB lines
	for scanner.Scan() {
		line := scanner.Bytes()
		if err := ws.WriteMessage(websocket.TextMessage, line); err != nil {
			log.Printf("[RequestID: %s] Failed to write ws message: %v", requestID, err)
			return
		}
	}
	if err := scanner.Err(); err != nil {
		log.Printf("[RequestID: %s] Error scanning Python stream: %v", requestID, err)
		_ = ws.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf(`{"type":"error","content":"%s"}`, err.Error())))
		return
	}
	_ = ws.WriteMessage(websocket.TextMessage, []byte(`{"type":"end","content":"stream_closed"}`))
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

	// Optional JWT validation: if configured and invalid, reject the request.
	userID, verr := verifyJWT(r)
	if verr != nil {
		http.Error(w, "invalid or expired token", http.StatusUnauthorized)
		return
	}
	// Also extract claims for propagation if present
	var userClaimsEncoded string
	if claims, err := parseJWTClaims(r); err == nil && claims != nil {
		if cj, err := json.Marshal(claims); err == nil {
			userClaimsEncoded = base64.RawURLEncoding.EncodeToString(cj)
		}
	}

	// Rate-limit per-IP (token bucket)
	host := r.RemoteAddr
	if h, _, err := net.SplitHostPort(r.RemoteAddr); err == nil {
		host = h
	}
	// Get or create token bucket from the TTL-evicting cache.
	tb := getTokenBucket(host)
	// allow: 1 token/sec, burst 5
	if !tb.Allow(1.0, 5.0) {
		metrics.IncRateLimited()
		http.Error(w, "rate limited", http.StatusTooManyRequests)
		return
	}

	// Fast-fail if orchestrator circuit is open (per-backend)
	if !getCircuitBreaker(pipelineURL).Allow() {
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
	if userID != "" {
		req.Header.Set("X-User-ID", userID)
	}
	if userClaimsEncoded != "" {
		req.Header.Set("X-User-Claims", userClaimsEncoded)
	}

	client := &http.Client{Timeout: 120 * time.Second}

	metrics.IncRequests()
	start := time.Now()
	resp, err := client.Do(req)
	dur := time.Since(start).Seconds()
	metrics.ObserveLatency(dur)
	if err != nil {
		metrics.IncFailures()
		getCircuitBreaker(pipelineURL).Failure()
		http.Error(w, fmt.Sprintf("failed to forward to orchestrator: %v", err), http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 500 {
		metrics.IncFailures()
		getCircuitBreaker(pipelineURL).Failure()
	} else {
		getCircuitBreaker(pipelineURL).Success()
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

	// Start IP cache evictor to avoid unbounded growth of per-IP buckets.
	startIPCacheEvictor()

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
		// compute ip cache size under lock to avoid data races
		ipCache.mu.RLock()
		ipCacheSize := len(ipCache.m)
		ipCache.mu.RUnlock()

		// include per-backend circuit breaker states
		cbStates := map[string]map[string]interface{}{}
		cbMap.Range(func(k, v interface{}) bool {
			key := k.(string)
			cb := v.(*CircuitBreaker)
			failures := atomic.LoadInt32(&cb.failures)
			openUntil := atomic.LoadInt64(&cb.openUntil)
			isOpen := time.Now().UnixNano() < openUntil
			cbStates[key] = map[string]interface{}{
				"failures": failures,
				"open":     isOpen,
				"open_until": func() interface{} {
					if openUntil == 0 {
						return nil
					}
					return time.Unix(0, openUntil).UTC().Format(time.RFC3339)
				}(),
			}
			return true
		})

		payload := map[string]interface{}{
			"orchestrator_requests_total": metrics.OrchRequests,
			"orchestrator_failures_total": metrics.OrchFailures,
			"orchestrator_latency_avg_s":  avg,
			"rate_limited_total":          metrics.RateLimited,
			"ip_cache_size":               ipCacheSize,
			"ip_cache_evictions_total":    metrics.IPCacheEvictions,
			"circuit_breakers":            cbStates,
		}
		metrics.mu.Unlock()
		b, _ := json.Marshal(payload)
		_, _ = w.Write(b)
	})
	// Debug endpoint exposing circuit-breaker states in JSON for quick inspection
	mux.HandleFunc("/debug/cbs", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		cbStates := map[string]map[string]interface{}{}
		cbMap.Range(func(k, v interface{}) bool {
			key := k.(string)
			cb := v.(*CircuitBreaker)
			failures := atomic.LoadInt32(&cb.failures)
			openUntil := atomic.LoadInt64(&cb.openUntil)
			isOpen := time.Now().UnixNano() < openUntil
			cbStates[key] = map[string]interface{}{
				"failures": failures,
				"open":     isOpen,
				"open_until": func() interface{} {
					if openUntil == 0 {
						return nil
					}
					return time.Unix(0, openUntil).UTC().Format(time.RFC3339)
				}(),
			}
			return true
		})
		if out, err := json.Marshal(cbStates); err == nil {
			_, _ = w.Write(out)
		} else {
			http.Error(w, "failed to marshal cb states", http.StatusInternalServerError)
		}
	})
	// Prometheus-format endpoint (optional) produced from internal metrics
	if prometheusEnabled {
		mux.HandleFunc("/metrics/prometheus", func(w http.ResponseWriter, _ *http.Request) {
			w.Header().Set("Content-Type", "text/plain; version=0.0.4")
			// Basic counters
			fmt.Fprintf(w, "# HELP orchestrator_requests_total Total orchestrator requests\n")
			fmt.Fprintf(w, "# TYPE orchestrator_requests_total counter\n")
			fmt.Fprintf(w, "orchestrator_requests_total %d\n", metrics.OrchRequests)

			fmt.Fprintf(w, "# HELP orchestrator_failures_total Total orchestrator failures\n")
			fmt.Fprintf(w, "# TYPE orchestrator_failures_total counter\n")
			fmt.Fprintf(w, "orchestrator_failures_total %d\n", metrics.OrchFailures)

			fmt.Fprintf(w, "# HELP orchestrator_latency_seconds Orchestrator request latency summary (sum/count)\n")
			fmt.Fprintf(w, "# TYPE orchestrator_latency_seconds summary\n")
			// Provide sum and count for a simple summary
			metrics.mu.Lock()
			latSum := metrics.OrchLatencySum
			latCnt := metrics.OrchLatencyCnt
			metrics.mu.Unlock()
			fmt.Fprintf(w, "orchestrator_latency_seconds_sum %f\n", latSum)
			fmt.Fprintf(w, "orchestrator_latency_seconds_count %d\n", latCnt)

			fmt.Fprintf(w, "# HELP rate_limited_total Total rate limited responses\n")
			fmt.Fprintf(w, "# TYPE rate_limited_total counter\n")
			fmt.Fprintf(w, "rate_limited_total %d\n", metrics.RateLimited)

			// IP cache metrics
			ipCache.mu.RLock()
			ipSize := len(ipCache.m)
			ipCache.mu.RUnlock()
			fmt.Fprintf(w, "# HELP ip_cache_size Current size of the IP token-bucket cache\n")
			fmt.Fprintf(w, "# TYPE ip_cache_size gauge\n")
			fmt.Fprintf(w, "ip_cache_size %d\n", ipSize)
			fmt.Fprintf(w, "# HELP ip_cache_evictions_total Total evictions from the IP cache\n")
			fmt.Fprintf(w, "# TYPE ip_cache_evictions_total counter\n")
			fmt.Fprintf(w, "ip_cache_evictions_total %d\n", metrics.IPCacheEvictions)

			// Circuit breaker states
			fmt.Fprintf(w, "# HELP circuit_breaker_failures Circuit breaker failure counts per backend\n")
			fmt.Fprintf(w, "# TYPE circuit_breaker_failures gauge\n")
			cbMap.Range(func(k, v interface{}) bool {
				key := k.(string)
				cb := v.(*CircuitBreaker)
				failures := atomic.LoadInt32(&cb.failures)
				// sanitize key for label value
				safeKey := strings.ReplaceAll(key, "\n", "_")
				fmt.Fprintf(w, "circuit_breaker_failures{backend=\"%s\"} %d\n", safeKey, failures)
				openUntil := atomic.LoadInt64(&cb.openUntil)
				isOpen := 0
				if time.Now().UnixNano() < openUntil {
					isOpen = 1
				}
				fmt.Fprintf(w, "circuit_breaker_open{backend=\"%s\"} %d\n", safeKey, isOpen)
				return true
			})
		})
	}
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
