package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/divijg19/Nargis/core-go/internal/auth"
	"github.com/divijg19/Nargis/core-go/internal/bus"
	"github.com/divijg19/Nargis/core-go/internal/config"
	"github.com/divijg19/Nargis/core-go/internal/metrics"
	"github.com/divijg19/Nargis/core-go/internal/resilience"
	"github.com/divijg19/Nargis/core-go/internal/scheduler"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

func main() {
	cfg := config.Load()
	appDeps = newGatewayDependencies(cfg)
	syncLegacyGlobalsFromDeps()

	logger := newLogger(cfg)
	slog.SetDefault(logger)
	slog.Info("Starting Gateway", "port", cfg.Port, "orchestrator", cfg.OrchestratorURL, "redis", cfg.RedisURL)

	var err error
	appDeps.rateLimitRDB, err = newRedisClient(cfg.RedisURL)
	if err != nil {
		slog.Warn("Failed to initialize Redis client for rate limiting; fail-open mode enabled", "error", err)
		appDeps.rateLimitRDB = nil
	} else {
		pingCtx, pingCancel := context.WithTimeout(context.Background(), 2*time.Second)
		pingErr := appDeps.rateLimitRDB.Ping(pingCtx).Err()
		pingCancel()
		if pingErr != nil {
			slog.Warn("Redis is unreachable for rate limiting; fail-open mode enabled", "error", pingErr)
			_ = appDeps.rateLimitRDB.Close()
			appDeps.rateLimitRDB = nil
		} else {
			slog.Info("Connected to Redis for rate limiting", "redis", cfg.RedisURL)
			defer appDeps.rateLimitRDB.Close()
		}
	}
	syncLegacyGlobalsFromDeps()

	if strings.TrimSpace(cfg.RedisURL) == "" {
		slog.Warn("REDIS_URL not set, running in degraded mode (no events, no Redis-backed rate limiting)")
		appDeps.busClient = nil
	} else {
		appDeps.busClient, err = bus.NewClient(normalizeRedisURL(cfg.RedisURL))
		if err != nil {
			slog.Warn("Failed to connect to Redis, real-time events disabled", "error", err)
			appDeps.busClient = nil
		} else {
			defer appDeps.busClient.Close()
			slog.Info("Connected to Redis")
		}
	}
	syncLegacyGlobalsFromDeps()

	apiProxy, err := newAPIReverseProxy(cfg.OrchestratorURL)
	if err != nil {
		slog.Error("Failed to initialize API reverse proxy", "error", err)
		os.Exit(1)
	}

	mux := http.NewServeMux()
	apiHandler := auth.TracingMiddleware(
		auth.JWTMiddleware(
			resilience.RateLimitMiddleware(appDeps.rateLimitRDB, 100, time.Minute)(apiProxy),
		),
	)
	mux.Handle("/metrics", promhttp.Handler())
	mux.Handle("/api/v1/", withCORSHandler(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/api/v1/internal/") {
			http.Error(w, "Forbidden", http.StatusForbidden)
			return
		}
		apiHandler.ServeHTTP(w, r)
	})))
	mux.Handle("/ws", auth.TracingMiddleware(http.HandlerFunc(handleConnections)))
	mux.HandleFunc("/health", healthHandler)
	mux.HandleFunc("/healthz", healthzHandler)
	mux.HandleFunc("/ready", readyHandler)
	mux.HandleFunc("/proxy/process-audio", proxyProcessAudioHandler)
	mux.HandleFunc("/v1/auth/", withCORS(proxyAuthHandler))

	server := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      metrics.InstrumentHTTP(mux),
		ReadTimeout:  cfg.ReadTimeout,
		WriteTimeout: cfg.WriteTimeout,
	}

	orchBase := getOrchestratorBaseURL()
	healthURL := strings.TrimRight(orchBase, "/") + "/health"
	if err := WaitForOrchestrator(healthURL, 30, 500*time.Millisecond); err != nil {
		slog.Error("Orchestrator not ready; aborting startup", "health_url", healthURL, "error", err)
		os.Exit(1)
	}
	slog.Info("Orchestrator ready", "health_url", healthURL)

	schedulerCtx, schedulerCancel := context.WithCancel(context.Background())
	defer schedulerCancel()
	scheduler.Start(schedulerCtx, cfg.OrchestratorURL, 5*time.Minute)

	go func() {
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("Server failed", "error", err)
			os.Exit(1)
		}
	}()

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
