package main

import (
	"io"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"

	"github.com/divijg19/Nargis/core-go/internal/auth"
	"github.com/google/uuid"
)

func newAPIReverseProxy(orchestratorURL string) (*httputil.ReverseProxy, error) {
	target, err := url.Parse(orchestratorURL)
	if err != nil {
		return nil, err
	}

	proxy := httputil.NewSingleHostReverseProxy(target)
	origDirector := proxy.Director
	proxy.Director = func(req *http.Request) {
		origDirector(req)
		req.URL.Scheme = target.Scheme
		req.URL.Host = target.Host
		req.Host = target.Host
	}
	proxy.ErrorHandler = func(rw http.ResponseWriter, req *http.Request, e error) {
		auth.LoggerFromContext(req.Context()).Error("api proxy failed", "error", e)
		http.Error(rw, "Upstream unavailable", http.StatusBadGateway)
	}

	return proxy, nil
}

func withCORS(h http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodOptions {
			origin := r.Header.Get("Origin")
			if origin != "" && isAllowedHTTPOrigin(origin) {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Vary", "Origin")
				w.Header().Set("Access-Control-Allow-Credentials", "true")
				w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Guest-Id")
				w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS")
			}
			w.WriteHeader(http.StatusNoContent)
			return
		}

		h(w, r)
	}
}

func withCORSHandler(h http.Handler) http.HandlerFunc {
	return withCORS(func(w http.ResponseWriter, r *http.Request) {
		h.ServeHTTP(w, r)
	})
}

func proxyAuthHandler(w http.ResponseWriter, r *http.Request) {
	syncDepsFromLegacyGlobals()
	base := getOrchestratorBaseURL()
	target, err := url.Parse(base)
	if err != nil {
		http.Error(w, "Bad orchestrator url", http.StatusInternalServerError)
		return
	}

	proxy := httputil.NewSingleHostReverseProxy(target)
	origDirector := proxy.Director
	proxy.Director = func(req *http.Request) {
		origDirector(req)
		req.URL.Scheme = target.Scheme
		req.URL.Host = target.Host
		req.Host = target.Host
	}
	proxy.ModifyResponse = func(resp *http.Response) error {
		origin := ""
		if resp != nil && resp.Request != nil {
			origin = resp.Request.Header.Get("Origin")
		}
		resp.Header.Del("Access-Control-Allow-Origin")
		resp.Header.Del("Access-Control-Allow-Credentials")
		resp.Header.Del("Access-Control-Allow-Headers")
		resp.Header.Del("Access-Control-Allow-Methods")
		if origin != "" && isAllowedHTTPOrigin(origin) {
			resp.Header.Set("Access-Control-Allow-Origin", origin)
			resp.Header.Set("Access-Control-Allow-Credentials", "true")
			resp.Header.Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Guest-Id")
			resp.Header.Set("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS")
			vary := resp.Header.Values("Vary")
			hasOrigin := false
			for _, v := range vary {
				for _, part := range strings.Split(v, ",") {
					if strings.EqualFold(strings.TrimSpace(part), "Origin") {
						hasOrigin = true
						break
					}
				}
			}
			if !hasOrigin {
				resp.Header.Add("Vary", "Origin")
			}
		}
		return nil
	}
	proxy.ErrorHandler = func(rw http.ResponseWriter, req *http.Request, e error) {
		auth.LoggerFromContext(req.Context()).Error("auth proxy failed", "error", e)
		http.Error(rw, "Auth service unavailable", http.StatusBadGateway)
	}

	proxy.ServeHTTP(w, r)
}

func proxyProcessAudioHandler(w http.ResponseWriter, r *http.Request) {
	syncDepsFromLegacyGlobals()
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	file, _, err := r.FormFile("audio_file")
	if err != nil {
		http.Error(w, "Invalid audio file", http.StatusBadRequest)
		return
	}
	defer file.Close()

	data, _ := io.ReadAll(file)
	reqID := uuid.New().String()

	stream, err := appDeps.orchClient.ProcessAudioBuffer(r.Context(), data, reqID)
	if err != nil {
		http.Error(w, "Processing failed", http.StatusBadGateway)
		return
	}
	defer stream.Close()

	w.Header().Set("Content-Type", "application/x-ndjson")
	io.Copy(w, stream)
}
