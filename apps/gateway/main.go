package main

import (
	"context"
	"io"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
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

	var err error
	busClient, err = bus.NewClient(cfg.RedisURL)
	if err != nil {
		slog.Warn("Failed to connect to Redis, real-time events disabled", "error", err)
	} else {
		defer busClient.Close()
		slog.Info("Connected to Redis")
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

func handleConnections(w http.ResponseWriter, r *http.Request) {
	// Auth check
	uid, err := auth.VerifyJWTFromRequest(r)
	if err != nil && os.Getenv("WS_REQUIRE_AUTH") == "1" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
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
				for event := range events {
					metrics.EventBusMessages.Inc()
					select {
					case send <- []byte(event):
					case <-ctx.Done():
						return
					}
				}
			}()
		}
	}

	for {
		_, msg, err := ws.ReadMessage()
		if err != nil {
			break
		}

		// VAD Check: Drop silence
		isSpeech, _ := vadProc.Process(msg)
		if !isSpeech {
			metrics.AudioFramesProcessed.WithLabelValues("dropped").Inc()
			// Optional: Log debug if needed, but mostly just skip
			continue
		}
		metrics.AudioFramesProcessed.WithLabelValues("forwarded").Inc()

		// Process audio using the new client
		reqID := uuid.New().String()
		slog.Info("Processing audio", "req_id", reqID, "user_id", uid)

		start := time.Now()
		// Use ProcessAudioBuffer as defined in client.go
		stream, err := orchClient.ProcessAudioBuffer(context.Background(), msg, reqID)
		metrics.OrchestratorLatency.Observe(time.Since(start).Seconds())
		
		if err != nil {
			slog.Error("Orchestrator failed", "error", err, "req_id", reqID)
			send <- []byte(`{"type": "error", "content": "AI service unavailable"}`)
			continue
		}

		// Stream response back to WS
		// Reading all for simplicity in this refactor step, but streaming copy is better for large responses
		respBytes, err := io.ReadAll(stream)
		stream.Close() // Close immediately after reading

		if err != nil {
			slog.Error("Failed to read response", "error", err, "req_id", reqID)
			continue
		}

		send <- respBytes
	}
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
