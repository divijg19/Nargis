package metrics

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

var (
	HTTPRequestsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "http_requests_total",
			Help: "Total HTTP requests processed by the gateway.",
		},
		[]string{"path", "status"},
	)

	HTTPRequestDurationSeconds = promauto.NewHistogram(
		prometheus.HistogramOpts{
			Name:    "http_request_duration_seconds",
			Help:    "HTTP request duration in seconds.",
			Buckets: prometheus.DefBuckets,
		},
	)

	ActiveWebsockets = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "active_websockets",
			Help: "Current number of active websocket connections.",
		},
	)
)

type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (sr *statusRecorder) WriteHeader(code int) {
	sr.status = code
	sr.ResponseWriter.WriteHeader(code)
}

func requestPathLabel(path string) string {
	switch {
	case strings.HasPrefix(path, "/api/v1/"):
		return "/api/v1/*"
	case strings.HasPrefix(path, "/v1/auth/"):
		return "/v1/auth/*"
	case strings.HasPrefix(path, "/ws"):
		return "/ws"
	default:
		if path == "" {
			return "/"
		}
		return path
	}
}

func InstrumentHTTP(next http.Handler) http.Handler {
	if next == nil {
		next = http.HandlerFunc(func(http.ResponseWriter, *http.Request) {})
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		started := time.Now()
		recorder := &statusRecorder{ResponseWriter: w, status: http.StatusOK}

		next.ServeHTTP(recorder, r)

		path := requestPathLabel(r.URL.Path)
		status := strconv.Itoa(recorder.status)
		HTTPRequestsTotal.WithLabelValues(path, status).Inc()
		HTTPRequestDurationSeconds.Observe(time.Since(started).Seconds())
	})
}
