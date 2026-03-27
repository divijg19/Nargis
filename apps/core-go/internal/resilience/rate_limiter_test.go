package resilience

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/divijg19/Nargis/core-go/internal/auth"
	"github.com/redis/go-redis/v9"
)

func newTestRedis(t *testing.T) *redis.Client {
	t.Helper()
	mini := miniredis.RunT(t)
	rdb := redis.NewClient(&redis.Options{Addr: mini.Addr()})
	t.Cleanup(func() {
		_ = rdb.Close()
	})
	return rdb
}

func TestRateLimitMiddleware_PerUser(t *testing.T) {
	rdb := newTestRedis(t)
	limit := 2
	window := time.Minute

	nextCalls := 0
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		nextCalls++
		w.WriteHeader(http.StatusOK)
	})
	h := RateLimitMiddleware(rdb, limit, window)(next)

	for i := 0; i < 3; i++ {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/tasks", nil)
		req = req.WithContext(auth.WithUserID(context.Background(), "user-123"))
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)

		if i < 2 && rec.Code != http.StatusOK {
			t.Fatalf("request %d expected 200, got %d", i+1, rec.Code)
		}
		if i == 2 && rec.Code != http.StatusTooManyRequests {
			t.Fatalf("request %d expected 429, got %d", i+1, rec.Code)
		}
	}

	if nextCalls != 2 {
		t.Fatalf("expected next to be called 2 times, got %d", nextCalls)
	}
}

func TestRateLimitMiddleware_FallbackToIP(t *testing.T) {
	rdb := newTestRedis(t)
	limit := 1
	window := time.Minute

	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	h := RateLimitMiddleware(rdb, limit, window)(next)

	req1 := httptest.NewRequest(http.MethodGet, "/api/v1/tasks", nil)
	req1.RemoteAddr = "10.0.0.7:1234"
	rec1 := httptest.NewRecorder()
	h.ServeHTTP(rec1, req1)
	if rec1.Code != http.StatusOK {
		t.Fatalf("first IP request expected 200, got %d", rec1.Code)
	}

	req2 := httptest.NewRequest(http.MethodGet, "/api/v1/tasks", nil)
	req2.RemoteAddr = "10.0.0.7:5678"
	rec2 := httptest.NewRecorder()
	h.ServeHTTP(rec2, req2)
	if rec2.Code != http.StatusTooManyRequests {
		t.Fatalf("second IP request expected 429, got %d", rec2.Code)
	}
}

func TestRateLimitMiddleware_NilRedisFailOpen(t *testing.T) {
	calls := 0
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls++
		w.WriteHeader(http.StatusOK)
	})
	h := RateLimitMiddleware(nil, 1, time.Minute)(next)

	for i := 0; i < 3; i++ {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/tasks", nil)
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200 with nil redis, got %d", rec.Code)
		}
	}

	if calls != 3 {
		t.Fatalf("expected fail-open middleware to call next 3 times, got %d", calls)
	}
}
