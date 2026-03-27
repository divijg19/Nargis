package resilience

import (
	"log/slog"
	"net"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/divijg19/Nargis/core-go/internal/auth"
	"github.com/redis/go-redis/v9"
)

// RateLimitMiddleware enforces a fixed-window Redis-backed limit per user or IP.
// Fail-open behavior: if Redis is unavailable, requests are allowed through.
func RateLimitMiddleware(rdb *redis.Client, limit int, window time.Duration) func(http.Handler) http.Handler {
	if limit <= 0 {
		limit = 100
	}
	if window <= 0 {
		window = time.Minute
	}

	return func(next http.Handler) http.Handler {
		if next == nil {
			next = http.HandlerFunc(func(http.ResponseWriter, *http.Request) {})
		}

		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if rdb == nil {
				next.ServeHTTP(w, r)
				return
			}

			identity := requesterIdentity(r)
			key := "rate_limit:" + identity

			count, err := rdb.Incr(r.Context(), key).Result()
			if err != nil {
				slog.Warn("rate limiter redis INCR failed; failing open", "error", err)
				next.ServeHTTP(w, r)
				return
			}

			if count == 1 {
				if err := rdb.Expire(r.Context(), key, window).Err(); err != nil {
					slog.Warn("rate limiter redis EXPIRE failed; failing open", "error", err)
					next.ServeHTTP(w, r)
					return
				}
			}

			if count > int64(limit) {
				w.Header().Set("Retry-After", retryAfterSeconds(window))
				http.Error(w, "Too Many Requests", http.StatusTooManyRequests)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

func requesterIdentity(r *http.Request) string {
	if uid, ok := auth.UserIDFromContext(r.Context()); ok {
		return uid
	}
	if uid := strings.TrimSpace(r.Header.Get("X-User-Id")); uid != "" {
		return uid
	}
	return clientIP(r)
}

func clientIP(r *http.Request) string {
	if xff := strings.TrimSpace(r.Header.Get("X-Forwarded-For")); xff != "" {
		parts := strings.Split(xff, ",")
		if len(parts) > 0 {
			if ip := strings.TrimSpace(parts[0]); ip != "" {
				return ip
			}
		}
	}
	if xrip := strings.TrimSpace(r.Header.Get("X-Real-Ip")); xrip != "" {
		return xrip
	}
	host, _, err := net.SplitHostPort(strings.TrimSpace(r.RemoteAddr))
	if err == nil && host != "" {
		return host
	}
	if ra := strings.TrimSpace(r.RemoteAddr); ra != "" {
		return ra
	}
	return "unknown"
}

func retryAfterSeconds(window time.Duration) string {
	secs := int(window.Seconds())
	if secs <= 0 {
		return "1"
	}
	return strconvItoa(secs)
}

func strconvItoa(v int) string {
	return strconv.FormatInt(int64(v), 10)
}
