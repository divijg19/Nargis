package scheduler

import (
	"bytes"
	"context"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"time"
)

func cronTickURL(baseURL string) string {
	base := strings.TrimSpace(baseURL)
	if base == "" {
		base = "http://localhost:8000"
	}
	return strings.TrimRight(base, "/") + "/api/v1/internal/cron/tick"
}

// Start launches a background worker that pings the Python cron endpoint.
func Start(ctx context.Context, orchestratorBaseURL string, interval time.Duration) {
	if interval <= 0 {
		interval = 5 * time.Minute
	}

	client := &http.Client{Timeout: 10 * time.Second}
	url := cronTickURL(orchestratorBaseURL)
	internalSecret := strings.TrimSpace(os.Getenv("INTERNAL_CRON_SECRET"))
	if internalSecret == "" {
		internalSecret = "dev_internal_secret"
	}
	ticker := time.NewTicker(interval)

	go func() {
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				slog.Info("Scheduler stopped")
				return
			case <-ticker.C:
				slog.Info("Scheduler Tick: Checking for proactive tasks")

				req, err := http.NewRequestWithContext(
					ctx,
					http.MethodPost,
					url,
					bytes.NewBuffer([]byte("{}")),
				)
				if err != nil {
					slog.Warn("Scheduler tick request build failed", "error", err)
					continue
				}
				req.Header.Set("Content-Type", "application/json")
				req.Header.Set("X-Internal-Secret", internalSecret)

				resp, err := client.Do(req)
				if err != nil {
					slog.Warn("Scheduler tick request failed", "error", err)
					continue
				}
				_ = resp.Body.Close()
				slog.Info("Scheduler tick dispatched", "status", resp.StatusCode)
			}
		}
	}()
}
