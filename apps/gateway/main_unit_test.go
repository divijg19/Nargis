package main

import (
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"github.com/divijg19/Nargis/gateway/internal/config"
)

func TestExtractAuthToken_PriorityAndFallbacks(t *testing.T) {
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

func TestReadyHandler_ReportsReadyAndDegraded(t *testing.T) {
	prevCfg := cfg
	prevBus := busClient
	defer func() {
		cfg = prevCfg
		busClient = prevBus
	}()

	orchUp := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	}))
	defer orchUp.Close()

	cfg = &config.Config{OrchestratorURL: orchUp.URL, RedisURL: ""}
	busClient = nil

	reqReady := httptest.NewRequest(http.MethodGet, "/ready", nil)
	rrReady := httptest.NewRecorder()
	readyHandler(rrReady, reqReady)

	if rrReady.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rrReady.Code)
	}
	bodyReady, _ := io.ReadAll(rrReady.Result().Body)
	bodyReadyStr := string(bodyReady)
	if !strings.Contains(bodyReadyStr, `"status":"ready"`) {
		t.Fatalf("expected ready status in body, got %s", bodyReadyStr)
	}
	if !strings.Contains(bodyReadyStr, `"orchestrator":{"url":"`+orchUp.URL+`/health","status":"ok"`) {
		t.Fatalf("expected orchestrator ok in body, got %s", bodyReadyStr)
	}

	cfg = &config.Config{OrchestratorURL: "http://127.0.0.1:1", RedisURL: ""}
	reqDegraded := httptest.NewRequest(http.MethodGet, "/ready", nil)
	rrDegraded := httptest.NewRecorder()
	readyHandler(rrDegraded, reqDegraded)

	if rrDegraded.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected status 503, got %d", rrDegraded.Code)
	}
	bodyDegraded, _ := io.ReadAll(rrDegraded.Result().Body)
	bodyDegradedStr := string(bodyDegraded)
	if !strings.Contains(bodyDegradedStr, `"status":"degraded"`) {
		t.Fatalf("expected degraded status in body, got %s", bodyDegradedStr)
	}
	if !strings.Contains(bodyDegradedStr, `"orchestrator":{"url":"http://127.0.0.1:1/health","status":"down"`) {
		t.Fatalf("expected orchestrator down in body, got %s", bodyDegradedStr)
	}
}

func TestJsonStringAndIfThen(t *testing.T) {
	escaped := jsonString("line1\n\"quoted\"\tvalue")
	expected := "\"line1\\n\\\"quoted\\\"\\tvalue\""
	if escaped != expected {
		t.Fatalf("unexpected jsonString output: got %s want %s", escaped, expected)
	}

	if got := ifThen(true, "a", "b"); got != "a" {
		t.Fatalf("expected 'a', got %q", got)
	}
	if got := ifThen(false, "a", "b"); got != "b" {
		t.Fatalf("expected 'b', got %q", got)
	}
}
