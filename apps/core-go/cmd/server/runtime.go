package main

import (
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/divijg19/Nargis/core-go/internal/config"
	"github.com/redis/go-redis/v9"
)

func extractAuthToken(r *http.Request) string {
	syncDepsFromLegacyGlobals()

	authHeader := strings.TrimSpace(r.Header.Get("Authorization"))
	if strings.HasPrefix(authHeader, "Bearer ") {
		return strings.TrimSpace(strings.TrimPrefix(authHeader, "Bearer "))
	}

	allowQueryToken := false
	if appDeps != nil && appDeps.config != nil {
		allowQueryToken = appDeps.config.WSAllowQueryToken
	} else {
		allowQueryToken = getEnvBoolWithFallback("WS_ALLOW_QUERY_TOKEN", false)
	}
	if allowQueryToken {
		if tok := strings.TrimSpace(r.URL.Query().Get("token")); tok != "" {
			return tok
		}
	}

	if c, err := r.Cookie("access_token"); err == nil {
		if tok := strings.TrimSpace(c.Value); tok != "" {
			return tok
		}
	}
	return ""
}

func newLogger(cfg *config.Config) *slog.Logger {
	levelName := strings.ToLower(strings.TrimSpace(getEnvWithFallback("LOG_LEVEL", "info")))
	formatName := strings.TrimSpace(getEnvWithFallback("LOG_FORMAT", "json"))
	if cfg != nil {
		if strings.TrimSpace(cfg.LogLevel) != "" {
			levelName = strings.ToLower(strings.TrimSpace(cfg.LogLevel))
		}
		if strings.TrimSpace(cfg.LogFormat) != "" {
			formatName = strings.TrimSpace(cfg.LogFormat)
		}
	}

	level := new(slog.LevelVar)
	switch levelName {
	case "debug":
		level.Set(slog.LevelDebug)
	case "warn", "warning":
		level.Set(slog.LevelWarn)
	case "error":
		level.Set(slog.LevelError)
	default:
		level.Set(slog.LevelInfo)
	}

	opts := &slog.HandlerOptions{Level: level, AddSource: true}
	if strings.EqualFold(formatName, "text") {
		return slog.New(slog.NewTextHandler(os.Stdout, opts))
	}

	return slog.New(slog.NewJSONHandler(os.Stdout, opts))
}

func getOrchestratorBaseURL() string {
	syncDepsFromLegacyGlobals()
	return appDeps.getOrchestratorBaseURL()
}

func normalizeRedisURL(raw string) string {
	v := strings.TrimSpace(raw)
	if v == "" {
		return ""
	}
	if strings.Contains(v, "://") {
		return v
	}
	return "redis://" + v
}

func newRedisClient(redisURL string) (*redis.Client, error) {
	normalized := normalizeRedisURL(redisURL)
	if normalized == "" {
		return nil, fmt.Errorf("redis url is empty")
	}
	opts, err := redis.ParseURL(normalized)
	if err != nil {
		return nil, fmt.Errorf("invalid redis url %q: %w", redisURL, err)
	}
	return redis.NewClient(opts), nil
}

func WaitForOrchestrator(healthURL string, maxRetries int, retryMs time.Duration) error {
	client := &http.Client{Timeout: 2 * time.Second}
	for i := 0; i < maxRetries; i++ {
		resp, err := client.Get(healthURL)
		if err == nil && resp != nil {
			_, _ = io.Copy(io.Discard, resp.Body)
			resp.Body.Close()
			if resp.StatusCode >= 200 && resp.StatusCode < 300 {
				return nil
			}
		}
		time.Sleep(retryMs)
	}
	return fmt.Errorf("orchestrator healthcheck failed after %d retries", maxRetries)
}

func isAllowedHTTPOrigin(origin string) bool {
	syncDepsFromLegacyGlobals()
	origin = strings.TrimSpace(origin)
	if origin == "" {
		return false
	}

	allowed := strings.TrimSpace(getEnvWithFallback("WS_ALLOWED_ORIGINS", "*"))
	if appDeps != nil && appDeps.config != nil && strings.TrimSpace(appDeps.config.WSAllowedOrigins) != "" {
		allowed = strings.TrimSpace(appDeps.config.WSAllowedOrigins)
	}

	if allowed == "" || allowed == "*" {
		return true
	}
	for _, o := range strings.Split(allowed, ",") {
		if strings.EqualFold(strings.TrimSpace(o), origin) {
			return true
		}
	}
	return false
}

func shouldRequireAuth() bool {
	syncDepsFromLegacyGlobals()
	if appDeps != nil && appDeps.config != nil {
		return appDeps.config.WSRequireAuth
	}
	return getEnvBoolWithFallback("WS_REQUIRE_AUTH", false)
}

func getVADMode() string {
	syncDepsFromLegacyGlobals()
	if appDeps != nil && appDeps.config != nil && strings.TrimSpace(appDeps.config.VADMode) != "" {
		return appDeps.config.VADMode
	}
	return getEnvWithFallback("VAD_MODE", "auto")
}

func getEnvWithFallback(key, fallback string) string {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		return v
	}
	return fallback
}

func getEnvBoolWithFallback(key string, fallback bool) bool {
	switch strings.ToLower(strings.TrimSpace(os.Getenv(key))) {
	case "1", "true", "yes", "on":
		return true
	case "0", "false", "no", "off":
		return false
	default:
		return fallback
	}
}
