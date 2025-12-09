package resilience

import (
	"sync/atomic"
	"time"
)

// CircuitBreaker is a tiny lock-free circuit breaker.
type CircuitBreaker struct {
	failures   int32
	openUntil  int64 // unix nanos
	threshold  int32
	openWindow time.Duration
}

func NewCircuitBreaker(threshold int32, openWindow time.Duration) *CircuitBreaker {
	return &CircuitBreaker{threshold: threshold, openWindow: openWindow}
}

func (cb *CircuitBreaker) Allow() bool {
	now := time.Now().UnixNano()
	openUntil := atomic.LoadInt64(&cb.openUntil)
	return openUntil <= now
}

func (cb *CircuitBreaker) Success() {
	atomic.StoreInt32(&cb.failures, 0)
}

func (cb *CircuitBreaker) Failure() {
	failures := atomic.AddInt32(&cb.failures, 1)
	if failures >= cb.threshold {
		openUntil := time.Now().Add(cb.openWindow).UnixNano()
		atomic.StoreInt64(&cb.openUntil, openUntil)
	}
}
