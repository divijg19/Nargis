package metrics

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

var (
	// ActiveConnections tracks the number of currently connected WebSocket clients
	ActiveConnections = promauto.NewGauge(prometheus.GaugeOpts{
		Name: "gateway_active_connections",
		Help: "The total number of active WebSocket connections",
	})

	// AudioFramesProcessed tracks the total number of audio frames handled
	// Status label can be "forwarded" or "dropped" (by VAD)
	AudioFramesProcessed = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "gateway_audio_frames_processed_total",
		Help: "The total number of audio frames processed",
	}, []string{"status"})

	// OrchestratorLatency tracks the duration of calls to the Python orchestrator
	OrchestratorLatency = promauto.NewHistogram(prometheus.HistogramOpts{
		Name:    "gateway_orchestrator_duration_seconds",
		Help:    "Time taken to process audio via the orchestrator",
		Buckets: prometheus.DefBuckets,
	})

	// EventBusMessages tracks messages received from Redis
	EventBusMessages = promauto.NewCounter(prometheus.CounterOpts{
		Name: "gateway_event_bus_messages_total",
		Help: "The total number of real-time events received from the event bus",
	})
)
