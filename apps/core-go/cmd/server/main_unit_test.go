package main

import (
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"github.com/divijg19/Nargis/core-go/internal/config"
)

func TestExtractAuthToken_PriorityAndFallbacks(t *testing.T) {
	resetGatewayTestState(t)

	t.Setenv("WS_ALLOW_QUERY_TOKEN", "0")

	reqHeader := httptest.NewRequest(http.MethodGet, "/ws?token=query-token", nil)
	reqHeader.Header.Set("Authorization", "Bearer header-token")
	reqHeader.AddCookie(&http.Cookie{Name: "access_token", Value: "cookie-token"})
	if got := extractAuthToken(reqHeader); got != "header-token" {
		t.Fatalf("expected header token, got %q", got)
	}

	reqCookie := httptest.NewRequest(http.MethodGet, "/ws", nil)
	reqCookie.AddCookie(&http.Cookie{Name: "access_token", Value: "cookie-token"})
	if got := extractAuthToken(reqCookie); got != "cookie-token" {
		t.Fatalf("expected cookie token, got %q", got)
	}

	t.Setenv("WS_ALLOW_QUERY_TOKEN", "1")
	reqQuery := httptest.NewRequest(http.MethodGet, "/ws?token=query-token", nil)
	if got := extractAuthToken(reqQuery); got != "query-token" {
		t.Fatalf("expected query token when enabled, got %q", got)
	}
}

func TestIsAllowedHTTPOrigin(t *testing.T) {
	resetGatewayTestState(t)

	t.Setenv("WS_ALLOWED_ORIGINS", "*")
	if !isAllowedHTTPOrigin("https://app.example.com") {
		t.Fatal("expected wildcard to allow origin")
	}

	t.Setenv("WS_ALLOWED_ORIGINS", "https://a.example.com, https://b.example.com")
	if !isAllowedHTTPOrigin("https://b.example.com") {
		t.Fatal("expected configured origin to be allowed")
	}
	if isAllowedHTTPOrigin("https://c.example.com") {
		t.Fatal("expected non-configured origin to be denied")
	}
	if isAllowedHTTPOrigin("") {
		t.Fatal("expected empty origin to be denied")
	}
}

func TestGetOrchestratorBaseURL_Precedence(t *testing.T) {
	resetGatewayTestState(t)

	prevCfg := cfg
	defer func() {
		cfg = prevCfg
	}()

	cfg = &config.Config{OrchestratorURL: "http://from-config"}
	t.Setenv("ORCHESTRATOR_URL", "http://from-env")
	if got := getOrchestratorBaseURL(); got != "http://from-config" {
		t.Fatalf("expected config value, got %q", got)
	}

	cfg = &config.Config{OrchestratorURL: "   "}
	if got := getOrchestratorBaseURL(); got != "http://from-env" {
		t.Fatalf("expected env fallback, got %q", got)
	}

	cfg = nil
	if err := os.Unsetenv("ORCHESTRATOR_URL"); err != nil {
		t.Fatalf("failed to unset env: %v", err)
	}
	if got := getOrchestratorBaseURL(); got != "http://localhost:8000" {
		t.Fatalf("expected hardcoded default, got %q", got)
	}
}

func TestReadyHandlerMatchesHealthzWhenRedisMissing(t *testing.T) {
	resetGatewayTestState(t)

	prevRDB := rateLimitRDB
	defer func() {
		rateLimitRDB = prevRDB
	}()

	rateLimitRDB = nil

	req := httptest.NewRequest(http.MethodGet, "/ready", nil)
	rr := httptest.NewRecorder()
	readyHandler(rr, req)

	if rr.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected status 503, got %d", rr.Code)
	}
	body, _ := io.ReadAll(rr.Result().Body)
	bodyStr := string(body)
	if !strings.Contains(bodyStr, `"status":"degraded"`) {
		t.Fatalf("expected degraded status in body, got %s", bodyStr)
	}
	if !strings.Contains(bodyStr, `"redis":"down"`) {
		t.Fatalf("expected redis down in body, got %s", bodyStr)
	}
}

func TestHealthzHandlerReportsRedisUnavailableWhenClientMissing(t *testing.T) {
	resetGatewayTestState(t)

	prevRDB := rateLimitRDB
	defer func() {
		rateLimitRDB = prevRDB
	}()

	rateLimitRDB = nil

	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	rr := httptest.NewRecorder()
	healthzHandler(rr, req)

	if rr.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected status 503, got %d", rr.Code)
	}
	body, _ := io.ReadAll(rr.Result().Body)
	bodyStr := string(body)
	if !strings.Contains(bodyStr, `"status":"degraded"`) {
		t.Fatalf("expected degraded status in body, got %s", bodyStr)
	}
	if !strings.Contains(bodyStr, `"redis":"down"`) {
		t.Fatalf("expected redis down in body, got %s", bodyStr)
	}
}

func TestWithCORSHandlesPreflightForAllowedOrigin(t *testing.T) {
	resetGatewayTestState(t)

	prevCfg := cfg
	defer func() {
		cfg = prevCfg
	}()

	cfg = &config.Config{WSAllowedOrigins: "https://app.example.com"}

	req := httptest.NewRequest(http.MethodOptions, "/api/v1/auth/session", nil)
	req.Header.Set("Origin", "https://app.example.com")

	rr := httptest.NewRecorder()
	withCORS(func(w http.ResponseWriter, _ *http.Request) {
		t.Fatal("preflight should not reach wrapped handler")
	})(rr, req)

	if rr.Code != http.StatusNoContent {
		t.Fatalf("expected status 204, got %d", rr.Code)
	}
	if got := rr.Header().Get("Access-Control-Allow-Origin"); got != "https://app.example.com" {
		t.Fatalf("expected allow origin header, got %q", got)
	}
	if got := rr.Header().Get("Access-Control-Allow-Credentials"); got != "true" {
		t.Fatalf("expected credentials header, got %q", got)
	}
}
