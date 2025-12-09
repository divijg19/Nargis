package resilience

import (
	"os"
	"strconv"
	"strings"
	"sync"
	"time"
)

// TokenBucket implements a simple token bucket rate limiter.
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

// ipEntry implements a simple TTL-evicting cache for per-IP token buckets.
// It stores a TokenBucket and the last seen timestamp.
type ipEntry struct {
	tb   *TokenBucket
	last time.Time
}

var ipCache = struct {
	mu sync.RWMutex
	m  map[string]*ipEntry
}{m: make(map[string]*ipEntry)}

// GetTokenBucket returns the TokenBucket for a host, creating it if missing
// and updating the last-seen timestamp.
func GetTokenBucket(host string) *TokenBucket {
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

// StartIPCacheEvictor starts a background goroutine that removes entries
// not seen within ttl minutes. Call once from main() before starting server.
func StartIPCacheEvictor() {
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
			ipCache.mu.Unlock()
			// In a real app, we might log 'removed' count here
		}
	}()
}
