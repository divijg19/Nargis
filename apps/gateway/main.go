package main

import (
	"bufio"
	"context"
	"io"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/divijg19/Nargis/gateway/internal/auth"
	"github.com/divijg19/Nargis/gateway/internal/bus"
	"github.com/divijg19/Nargis/gateway/internal/config"
	"github.com/divijg19/Nargis/gateway/internal/metrics"
	"github.com/divijg19/Nargis/gateway/internal/orchestrator"
	"github.com/divijg19/Nargis/gateway/internal/resilience"
	"github.com/divijg19/Nargis/gateway/internal/vad"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

var (
	cfg        *config.Config
	orchClient *orchestrator.Client
	busClient  *bus.Client
	vadProc    *vad.Processor
	upgrader   websocket.Upgrader
	audioSem   chan struct{}
)

func main() {
	// 1. Setup Structured Logging
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	slog.SetDefault(logger)

	// 2. Load Config
	cfg = config.Load()
	slog.Info("Starting Gateway", "port", cfg.Port, "orchestrator", cfg.OrchestratorURL, "redis", cfg.RedisURL)

	// 3. Initialize Dependencies
	orchClient = orchestrator.NewClient(cfg.OrchestratorURL)

	// Initialize VAD
	vadProc = vad.NewProcessor(vad.DefaultConfig())

	// Initialize semaphore for audio concurrency (limit 4)
	audioSem = make(chan struct{}, 4)

	var err error
	if cfg.RedisURL == "" {
		slog.Warn("REDIS_URL not set, running in degraded mode (no events)")
		busClient = nil
	} else {
		busClient, err = bus.NewClient(cfg.RedisURL)
		if err != nil {
			slog.Warn("Failed to connect to Redis, real-time events disabled", "error", err)
			busClient = nil
		} else {
			defer busClient.Close()
			slog.Info("Connected to Redis")
		}
	}

	resilience.StartIPCacheEvictor()

	upgrader = websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool { return auth.CheckOrigin(r) },
	}

	// 4. Setup Router
	mux := http.NewServeMux()
	mux.Handle("/metrics", promhttp.Handler())
	mux.HandleFunc("/ws", handleConnections)
	mux.HandleFunc("/health", healthHandler)
	mux.HandleFunc("/ready", readyHandler)
	mux.HandleFunc("/proxy/process-audio", proxyProcessAudioHandler)

	server := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      mux,
		ReadTimeout:  cfg.ReadTimeout,
		WriteTimeout: cfg.WriteTimeout,
	}

	// 5. Start Server
	go func() {
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("Server failed", "error", err)
			os.Exit(1)
		}
	}()

	// 6. Graceful Shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	slog.Info("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := server.Shutdown(ctx); err != nil {
		slog.Error("Server forced to shutdown", "error", err)
	}
	slog.Info("Server exited gracefully")
}

func healthHandler(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"status":"ok"}`))
}

func readyHandler(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()

	apiStatus := "unknown"
	apiErr := ""
	apiURL := strings.TrimRight(cfg.OrchestratorURL, "/") + "/health"

	client := &http.Client{Timeout: 2 * time.Second}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, apiURL, nil)
	if err != nil {
		apiStatus = "error"
		apiErr = err.Error()
	} else {
		resp, err := client.Do(req)
		if err != nil {
			apiStatus = "down"
			apiErr = err.Error()
		} else {
			resp.Body.Close()
			if resp.StatusCode >= 200 && resp.StatusCode < 300 {
				apiStatus = "ok"
			} else {
				apiStatus = "bad_status"
				apiErr = resp.Status
			}
		}
	}

	redisStatus := "disabled"
	redisErr := ""
	if cfg.RedisURL != "" {
		if busClient == nil {
			redisStatus = "down"
			redisErr = "not connected"
		} else {
			redisStatus = "ok"
			if err := busClient.Ping(ctx); err != nil {
				redisStatus = "down"
				redisErr = err.Error()
			}
		}
	}

	status := http.StatusOK
	if apiStatus != "ok" {
		status = http.StatusServiceUnavailable
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	io.WriteString(
		w,
		"{"+
			"\"status\":"+jsonString(ifThen(status == http.StatusOK, "ready", "degraded"))+","+
			"\"orchestrator\":{"+
			"\"url\":"+jsonString(apiURL)+","+
			"\"status\":"+jsonString(apiStatus)+","+
			"\"error\":"+jsonString(apiErr)+""+
			"},"+
			"\"redis\":{"+
			"\"status\":"+jsonString(redisStatus)+","+
			"\"error\":"+jsonString(redisErr)+""+
			"}"+
			"}",
	)
}

func jsonString(s string) string {
	// Minimal JSON string escaper for readiness output.
	s = strings.ReplaceAll(s, "\\", "\\\\")
	s = strings.ReplaceAll(s, "\"", "\\\"")
	s = strings.ReplaceAll(s, "\n", "\\n")
	s = strings.ReplaceAll(s, "\r", "\\r")
	s = strings.ReplaceAll(s, "\t", "\\t")
	return "\"" + s + "\""
}

func ifThen(cond bool, a, b string) string {
	if cond {
		return a
	}
	return b
}

// safeSend writes to the send channel but recovers from a panic if the
// channel has been closed concurrently (prevents test/runtime races).
func safeSend(send chan<- []byte, msg []byte) {
	defer func() {
		if r := recover(); r != nil {
			// ignore send on closed channel
		}
	}()
	send <- msg
}

func handleConnections(w http.ResponseWriter, r *http.Request) {
	// Ensure semaphore is initialized (tests may not call main())
	if audioSem == nil {
		audioSem = make(chan struct{}, 4)
	}
	// Auth check
	uid, err := auth.VerifyJWTFromRequest(r)
	if os.Getenv("WS_REQUIRE_AUTH") == "1" {
		if err != nil || strings.TrimSpace(uid) == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}
	}

	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		slog.Error("WS upgrade failed", "error", err)
		return
	}
	metrics.ActiveConnections.Inc()
	defer func() {
		ws.Close()
		metrics.ActiveConnections.Dec()
	}()

	// Channel for outgoing messages to ensure thread-safety
	send := make(chan []byte, 256)

	// Writer Goroutine
	go func() {
		for msg := range send {
			if err := ws.WriteMessage(websocket.TextMessage, msg); err != nil {
				slog.Error("WS write failed", "error", err)
				return
			}
		}
	}()
	defer close(send)

	// Redis Subscriber Goroutine
	if busClient != nil && uid != "" {
		ctx, cancel := context.WithCancel(r.Context())
		defer cancel()

		events, err := busClient.SubscribeToUserEvents(ctx, uid)
		if err != nil {
			slog.Error("Failed to subscribe to user events", "uid", uid, "error", err)
		} else {
			go func() {
				for {
					select {
					case <-ctx.Done():
						return
					case event, ok := <-events:
						if !ok {
							return
						}
						metrics.EventBusMessages.Inc()
						// best-effort delivery; safeSend will recover if channel closed
						safeSend(send, []byte(event))
					}
				}
			}()
		}
	}

	for {
		msgType, msg, err := ws.ReadMessage()
		if err != nil {
			break
		}

		// Control frames: the web client sends textual control tokens (e.g. EOS/STOP).
		// These are not audio and must never be forwarded to the orchestrator.
		if msgType == websocket.TextMessage {
			txt := strings.TrimSpace(string(msg))
			switch txt {
			case "EOS", "STOP":
				// Best-effort: ignore.
				continue
			default:
				// Ignore arbitrary text frames.
				continue
			}
		}
		if msgType != websocket.BinaryMessage {
			continue
		}

		// VAD Check: Drop silence. Only applies to likely raw PCM; containerized
		// audio (WebM/Opus, WAV, etc.) should bypass this filter.
		if shouldApplyVAD(msg) {
			isSpeech, _ := vadProc.Process(msg)
			if !isSpeech {
				metrics.AudioFramesProcessed.WithLabelValues("dropped").Inc()
				continue
			}
		}
		metrics.AudioFramesProcessed.WithLabelValues("forwarded").Inc()

		// Concurrency limit: try to acquire semaphore
		select {
		case audioSem <- struct{}{}:
			// Acquired slot
		default:
			// Pool full, reject request
			safeSend(send, []byte(`{"type": "error", "content": "Too many requests, try again later."}`))
			continue
		}

		go func(msg []byte, send chan<- []byte, uid string) {
			defer func() { <-audioSem }()
			reqID := uuid.New().String()
			slog.Info("Processing audio", "req_id", reqID, "user_id", uid)
			start := time.Now()
			ctx, cancel := context.WithTimeout(r.Context(), 120*time.Second)
			defer cancel()
			stream, err := orchClient.ProcessAudioBuffer(ctx, msg, reqID)
			metrics.OrchestratorLatency.Observe(time.Since(start).Seconds())
			if err != nil {
				slog.Error("Orchestrator failed", "error", err, "req_id", reqID)
				safeSend(send, []byte(`{"type": "error", "content": "AI service unavailable"}`))
				return
			}
			defer stream.Close()

			scanner := bufio.NewScanner(stream)
			// Some responses can be large; bump the scanner buffer to avoid truncation.
			buf := make([]byte, 0, 64*1024)
			scanner.Buffer(buf, 1024*1024)
			for scanner.Scan() {
				line := strings.TrimSpace(scanner.Text())
				if line == "" {
					continue
				}
				safeSend(send, []byte(line))
			}
			if err := scanner.Err(); err != nil {
				slog.Error("Failed to stream response", "error", err, "req_id", reqID)
				safeSend(send, []byte(`{"type": "error", "content": "Failed to stream response"}`))
				return
			}
		}(msg, send, uid)
	}
}

func shouldApplyVAD(msg []byte) bool {
	// Modes:
	// - VAD_MODE=off  -> never apply
	// - VAD_MODE=on   -> always apply (for binary frames)
	// - default/auto  -> apply only when payload looks like raw PCM
	mode := strings.ToLower(strings.TrimSpace(os.Getenv("VAD_MODE")))
	switch mode {
	case "off", "0", "false", "disabled":
		return false
	case "on", "1", "true", "enabled":
		return true
	default:
		// auto
		if len(msg) < 2 {
			return false
		}
		if looksLikeAudioContainer(msg) {
			return false
		}
		// Raw PCM is typically 16-bit little endian; require even length.
		if len(msg)%2 != 0 {
			return false
		}
		return true
	}
}

func looksLikeAudioContainer(b []byte) bool {
	if len(b) >= 4 {
		// EBML (WebM/Matroska)
		if b[0] == 0x1A && b[1] == 0x45 && b[2] == 0xDF && b[3] == 0xA3 {
			return true
		}
		// Ogg
		if b[0] == 'O' && b[1] == 'g' && b[2] == 'g' && b[3] == 'S' {
			return true
		}
		// WAV/RIFF
		if b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F' {
			return true
		}
		// FLAC
		if b[0] == 'f' && b[1] == 'L' && b[2] == 'a' && b[3] == 'C' {
			return true
		}
		// MP3 with ID3 tag
		if b[0] == 'I' && b[1] == 'D' && b[2] == '3' {
			return true
		}
	}
	return false
}

func proxyProcessAudioHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	file, _, err := r.FormFile("audio_file")
	if err != nil {
		http.Error(w, "Invalid audio file", http.StatusBadRequest)
		return
	}
	defer file.Close()

	data, _ := io.ReadAll(file)
	reqID := uuid.New().String()

	stream, err := orchClient.ProcessAudioBuffer(r.Context(), data, reqID)
	if err != nil {
		http.Error(w, "Processing failed", http.StatusBadGateway)
		return
	}
	defer stream.Close()

	w.Header().Set("Content-Type", "application/x-ndjson")
	io.Copy(w, stream)
}
