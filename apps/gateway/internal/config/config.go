package config

import (
	"os"
	"time"
)

type Config struct {
	Port             string
	OrchestratorURL  string
	RedisURL         string
	WSAllowedOrigins string
	ReadTimeout      time.Duration
	WriteTimeout     time.Duration
}

func Load() *Config {
	return &Config{
		Port:             getEnv("PORT", "8080"),
		OrchestratorURL:  getEnv("ORCHESTRATOR_URL", "http://localhost:8000"),
		RedisURL:         getEnv("REDIS_URL", "redis://localhost:6379"),
		WSAllowedOrigins: getEnv("WS_ALLOWED_ORIGINS", "*"),
		ReadTimeout:      10 * time.Second,
		WriteTimeout:     10 * time.Second,
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
