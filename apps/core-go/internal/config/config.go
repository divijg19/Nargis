package config

import (
	"os"
	"time"
)

type Config struct {
	Port              string
	OrchestratorURL   string
	RedisURL          string
	WSAllowedOrigins  string
	WSAllowQueryToken bool
	WSRequireAuth     bool
	VADMode           string
	LogLevel          string
	LogFormat         string
	ReadTimeout       time.Duration
	WriteTimeout      time.Duration
}

func Load() *Config {
	port := os.Getenv("PORT")
	if port == "" {
		port = defaultPort()
	}

	return &Config{
		Port:              port,
		OrchestratorURL:   getEnv("ORCHESTRATOR_URL", defaultOrchestratorURL()),
		RedisURL:          getEnv("REDIS_URL", "localhost:6379"),
		WSAllowedOrigins:  getEnv("WS_ALLOWED_ORIGINS", "*"),
		WSAllowQueryToken: getEnvBool("WS_ALLOW_QUERY_TOKEN", false),
		WSRequireAuth:     getEnvBool("WS_REQUIRE_AUTH", false),
		VADMode:           getEnv("VAD_MODE", "auto"),
		LogLevel:          getEnv("LOG_LEVEL", "info"),
		LogFormat:         getEnv("LOG_FORMAT", "json"),
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      10 * time.Second,
	}
}

func defaultPort() string {
	// Hugging Face Spaces commonly expects the app to bind to 7860.
	if isRunningOnHuggingFace() {
		return "7860"
	}
	return "8080"
}

func defaultOrchestratorURL() string {
	// Local dev default: api-py runs on 8000.
	return "http://localhost:8000"
}

func isRunningOnHuggingFace() bool {
	// Common env vars present in HF Spaces.
	if os.Getenv("SPACE_ID") != "" {
		return true
	}
	if os.Getenv("HF_SPACE_ID") != "" {
		return true
	}
	if os.Getenv("SYSTEM") == "spaces" {
		return true
	}
	return false
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getEnvBool(key string, fallback bool) bool {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}

	switch v {
	case "1", "true", "TRUE", "True", "yes", "YES", "on", "ON":
		return true
	case "0", "false", "FALSE", "False", "no", "NO", "off", "OFF":
		return false
	default:
		return fallback
	}
}
