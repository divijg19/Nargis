package main

import (
	"context"
	"net/http"
	"time"
)

func healthHandler(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"status":"ok"}`))
}

func healthzHandler(w http.ResponseWriter, r *http.Request) {
	syncDepsFromLegacyGlobals()
	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()

	if appDeps.rateLimitRDB == nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusServiceUnavailable)
		w.Write([]byte(`{"status":"degraded","redis":"down"}`))
		return
	}

	if err := appDeps.rateLimitRDB.Ping(ctx).Err(); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusServiceUnavailable)
		w.Write([]byte(`{"status":"degraded","redis":"down"}`))
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status":"ok","redis":"ok"}`))
}

func readyHandler(w http.ResponseWriter, r *http.Request) {
	healthzHandler(w, r)
}
