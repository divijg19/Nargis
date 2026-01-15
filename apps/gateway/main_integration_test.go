package main

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/divijg19/Nargis/gateway/internal/auth"
	"github.com/divijg19/Nargis/gateway/internal/orchestrator"
	"github.com/divijg19/Nargis/gateway/internal/vad"
	"github.com/gorilla/websocket"
)

// makeToken creates a simple HS256 JWT with `sub` and `exp` claims.
func makeToken(secret, sub string) string {
	head := base64.RawURLEncoding.EncodeToString([]byte(`{"alg":"HS256","typ":"JWT"}`))

	payloadMap := map[string]interface{}{
		"sub": sub,
		"exp": time.Now().Add(1 * time.Hour).Unix(),
	}
	pb, _ := json.Marshal(payloadMap)
	payload := base64.RawURLEncoding.EncodeToString(pb)
	signing := fmt.Sprintf("%s.%s", head, payload)
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(signing))
	sig := mac.Sum(nil)
	sigb := base64.RawURLEncoding.EncodeToString(sig)
	return fmt.Sprintf("%s.%s", signing, sigb)
}

// fakeOrchestrator streams a few NDJSON lines and then closes.
func fakeOrchestrator(w http.ResponseWriter, r *http.Request) {
	// Drain the request body to prevent blocking upstream pipes
	_, _ = io.Copy(io.Discard, r.Body)

	w.Header().Set("Content-Type", "application/x-ndjson")
	flusher, ok := w.(http.Flusher)
	if ok {
		// write a response line, flush, then an end marker
		fmt.Fprintln(w, `{"type":"response","content":"ok from orchestrator"}`)
		flusher.Flush()
		time.Sleep(10 * time.Millisecond)
		fmt.Fprintln(w, `{"type":"end","content":"done"}`)
		flusher.Flush()
	} else {
		// fallback if response does not support flush
		fmt.Fprintln(w, `{"type":"response","content":"ok from orchestrator"}`)
		fmt.Fprintln(w, `{"type":"end","content":"done"}`)
	}
}

func fakeOrchestratorCounting(counter *atomic.Int64) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		counter.Add(1)
		fakeOrchestrator(w, r)
	}
}

func fakeOrchestratorBlocking(started chan<- struct{}, release <-chan struct{}) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		_, _ = io.Copy(io.Discard, r.Body)
		select {
		case started <- struct{}{}:
		default:
		}
		<-release
		w.Header().Set("Content-Type", "application/x-ndjson")
		fmt.Fprintln(w, `{"type":"response","content":"ok from orchestrator"}`)
		fmt.Fprintln(w, `{"type":"end","content":"done"}`)
	}
}

func TestGatewayCookieWSAuthIntegration(t *testing.T) {
	// Simpler WS test: verify gateway accepts cookie on upgrade and we can echo the resolved user id.
	secret := "test-hmac-secret"
	os.Setenv("JWT_SECRET_KEY", secret)

	upgrader = websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool { return true },
	}

	// Handler that upgrades and replies with the verified user id (using verifyJWT)
	authEcho := func(w http.ResponseWriter, r *http.Request) {
		ws, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			t.Logf("upgrade failed: %v", err)
			return
		}
		defer ws.Close()
		uid, err := auth.VerifyJWTFromRequest(r)
		if err != nil {
			_ = ws.WriteMessage(websocket.TextMessage, []byte(`{"error":"unauth"}`))
			return
		}
		_ = ws.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf(`{"user":"%s"}`, uid)))
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/ws-auth", authEcho)
	srv := httptest.NewServer(mux)
	defer srv.Close()

	wsURL := "ws" + strings.TrimPrefix(srv.URL, "http") + "/ws-auth"
	token := makeToken(secret, "ws-user-42")
	header := http.Header{}
	header.Add("Cookie", "access_token="+token)

	conn, resp, err := websocket.DefaultDialer.Dial(wsURL, header)
	if err != nil {
		t.Fatalf("dial failed: %v resp=%v", err, resp)
	}
	defer conn.Close()
	_, msg, err := conn.ReadMessage()
	if err != nil {
		t.Fatalf("read failed: %v", err)
	}
	if !strings.Contains(string(msg), "ws-user-42") {
		t.Fatalf("unexpected message: %s", string(msg))
	}
}

func TestGatewayProxyCookieAuthIntegration(t *testing.T) {
	secret := "test-hmac-secret"
	os.Setenv("JWT_SECRET_KEY", secret)

	// fake orchestrator as above
	orch := httptest.NewServer(http.HandlerFunc(fakeOrchestrator))
	defer orch.Close()
	os.Setenv("ORCHESTRATOR_URL", orch.URL)

	// Start gateway mux with proxy handler
	mux := http.NewServeMux()
	mux.HandleFunc("/proxy/process-audio", proxyProcessAudioHandler)
	srv := httptest.NewServer(mux)
	defer srv.Close()

	// Initialize orchestrator client for the proxy handler to use
	orchClient = orchestrator.NewClient(orch.URL)

	// Build POST request to proxy with cookie
	client := &http.Client{Timeout: 3 * time.Second}

	// Create multipart body
	bodyBuf := &bytes.Buffer{}
	mw := multipart.NewWriter(bodyBuf)
	part, _ := mw.CreateFormFile("audio_file", "test.wav")
	part.Write([]byte("dummy audio content"))
	mw.Close()

	req, err := http.NewRequest("POST", srv.URL+"/proxy/process-audio", bodyBuf)
	if err != nil {
		t.Fatalf("failed create req: %v", err)
	}
	req.Header.Set("Content-Type", mw.FormDataContentType())
	req.Header.Set("Cookie", "access_token="+makeToken(secret, "proxy-user"))

	resp, err := client.Do(req)
	if err != nil {
		t.Fatalf("proxy request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		t.Fatalf("unexpected status: %d", resp.StatusCode)
	}
	// Read body
	b, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("failed read body: %v", err)
	}
	body := string(b)
	if !strings.Contains(body, "ok from orchestrator") {
		t.Fatalf("unexpected body: %s", body)
	}
}

// Full streaming test: exercise the gateway streaming path
func TestGatewayFullStreaming(t *testing.T) {
	secret := "test-hmac-secret"
	os.Setenv("JWT_SECRET_KEY", secret)

	// Start fake orchestrator server that emits NDJSON
	orch := httptest.NewServer(http.HandlerFunc(fakeOrchestrator))
	defer orch.Close()
	os.Setenv("ORCHESTRATOR_URL", orch.URL)

	// Initialize globals
	orchClient = orchestrator.NewClient(orch.URL)

	// Permissive VAD for testing
	vCfg := vad.DefaultConfig()
	vCfg.EnergyThreshold = 0.0
	vadProc = vad.NewProcessor(vCfg)

	upgrader = websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool { return true },
	}

	// Start gateway mux with the real handleConnections handler
	mux := http.NewServeMux()
	mux.HandleFunc("/ws", handleConnections)
	srv := httptest.NewServer(mux)
	defer srv.Close()

	wsURL := "ws" + strings.TrimPrefix(srv.URL, "http") + "/ws"
	token := makeToken(secret, "stream-user-1")
	header := http.Header{}
	header.Add("Cookie", "access_token="+token)

	conn, resp, err := websocket.DefaultDialer.Dial(wsURL, header)
	if err != nil {
		t.Fatalf("dial failed: %v resp=%v", err, resp)
	}
	defer conn.Close()

	// Send a couple of binary chunks then EOS
	// Send 2 bytes to ensure it forms at least one int16 sample
	if err := conn.WriteMessage(websocket.BinaryMessage, []byte{0x1, 0x0}); err != nil {
		t.Fatalf("write chunk failed: %v", err)
	}
	if err := conn.WriteMessage(websocket.BinaryMessage, []byte{0x2, 0x0}); err != nil {
		t.Fatalf("write chunk failed: %v", err)
	}
	if err := conn.WriteMessage(websocket.TextMessage, []byte("EOS")); err != nil {
		t.Fatalf("write EOS failed: %v", err)
	}

	// Read NDJSON messages until we get end marker
	conn.SetReadDeadline(time.Now().Add(8 * time.Second))
	gotResponse := false
	gotEnd := false
	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			t.Fatalf("read failed: %v", err)
		}
		s := strings.TrimSpace(string(msg))
		t.Logf("WS msg: %s", s)
		if strings.Contains(s, "response") {
			gotResponse = true
		}
		if strings.Contains(s, "\"type\":\"end\"") || strings.Contains(s, "end") {
			gotEnd = true
			break
		}
	}
	if !gotResponse {
		t.Fatalf("did not receive response via gateway")
	}
	if !gotEnd {
		t.Fatalf("did not receive end marker")
	}
}

func TestGatewayWSRejectsMissingOriginWhenAllowlistSet(t *testing.T) {
	os.Setenv("WS_ALLOWED_ORIGINS", "https://nargis.vercel.app")
	defer os.Unsetenv("WS_ALLOWED_ORIGINS")

	upgrader = websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool { return auth.CheckOrigin(r) },
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		ws, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			return
		}
		ws.Close()
	})
	srv := httptest.NewServer(mux)
	defer srv.Close()

	wsURL := "ws" + strings.TrimPrefix(srv.URL, "http") + "/ws"
	// Missing Origin header should fail because allowlist is set.
	_, resp, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err == nil {
		t.Fatalf("expected dial to fail")
	}
	if resp == nil {
		t.Fatalf("expected non-nil HTTP response")
	}
	if resp.StatusCode != http.StatusForbidden {
		t.Fatalf("expected 403, got %d", resp.StatusCode)
	}
}

func TestGatewayWSRequiresAuthWhenEnabled(t *testing.T) {
	secret := "test-hmac-secret"
	os.Setenv("JWT_SECRET_KEY", secret)
	os.Setenv("WS_REQUIRE_AUTH", "1")
	defer os.Unsetenv("WS_REQUIRE_AUTH")

	// Minimal deps for handler
	orch := httptest.NewServer(http.HandlerFunc(fakeOrchestrator))
	defer orch.Close()
	orchClient = orchestrator.NewClient(orch.URL)
	vCfg := vad.DefaultConfig()
	vCfg.EnergyThreshold = 0.0
	vadProc = vad.NewProcessor(vCfg)
	audioSem = make(chan struct{}, 4)

	upgrader = websocket.Upgrader{CheckOrigin: func(r *http.Request) bool { return true }}
	mux := http.NewServeMux()
	mux.HandleFunc("/ws", handleConnections)
	srv := httptest.NewServer(mux)
	defer srv.Close()

	wsURL := "ws" + strings.TrimPrefix(srv.URL, "http") + "/ws"
	_, resp, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err == nil {
		t.Fatalf("expected unauthorized dial to fail")
	}
	if resp == nil {
		t.Fatalf("expected HTTP response")
	}
	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", resp.StatusCode)
	}
}

func TestGatewayWSEOSNotForwardedToOrchestrator(t *testing.T) {
	secret := "test-hmac-secret"
	os.Setenv("JWT_SECRET_KEY", secret)

	var calls atomic.Int64
	orch := httptest.NewServer(http.HandlerFunc(fakeOrchestratorCounting(&calls)))
	defer orch.Close()
	orchClient = orchestrator.NewClient(orch.URL)

	vCfg := vad.DefaultConfig()
	vCfg.EnergyThreshold = 0.0
	vadProc = vad.NewProcessor(vCfg)
	audioSem = make(chan struct{}, 4)

	upgrader = websocket.Upgrader{CheckOrigin: func(r *http.Request) bool { return true }}
	mux := http.NewServeMux()
	mux.HandleFunc("/ws", handleConnections)
	srv := httptest.NewServer(mux)
	defer srv.Close()

	wsURL := "ws" + strings.TrimPrefix(srv.URL, "http") + "/ws"
	header := http.Header{}
	header.Add("Cookie", "access_token="+makeToken(secret, "stream-user-2"))

	conn, resp, err := websocket.DefaultDialer.Dial(wsURL, header)
	if err != nil {
		t.Fatalf("dial failed: %v resp=%v", err, resp)
	}
	defer conn.Close()

	if err := conn.WriteMessage(websocket.TextMessage, []byte("EOS")); err != nil {
		t.Fatalf("write EOS failed: %v", err)
	}
	// Give the server a moment to potentially mis-forward.
	time.Sleep(50 * time.Millisecond)
	if got := calls.Load(); got != 0 {
		t.Fatalf("expected 0 orchestrator calls, got %d", got)
	}
}

func TestGatewayWSConcurrencyLimitReturnsError(t *testing.T) {
	secret := "test-hmac-secret"
	os.Setenv("JWT_SECRET_KEY", secret)

	started := make(chan struct{}, 1)
	release := make(chan struct{})
	orch := httptest.NewServer(http.HandlerFunc(fakeOrchestratorBlocking(started, release)))
	defer orch.Close()
	orchClient = orchestrator.NewClient(orch.URL)

	// Disable VAD for container-ish payloads; keep deterministic.
	os.Setenv("VAD_MODE", "off")
	defer os.Unsetenv("VAD_MODE")
	vadProc = vad.NewProcessor(vad.DefaultConfig())

	// Force small concurrency so we can reliably exceed it.
	audioSem = make(chan struct{}, 1)

	upgrader = websocket.Upgrader{CheckOrigin: func(r *http.Request) bool { return true }}
	mux := http.NewServeMux()
	mux.HandleFunc("/ws", handleConnections)
	srv := httptest.NewServer(mux)
	defer srv.Close()

	wsURL := "ws" + strings.TrimPrefix(srv.URL, "http") + "/ws"
	header := http.Header{}
	header.Add("Cookie", "access_token="+makeToken(secret, "stream-user-3"))
	conn, resp, err := websocket.DefaultDialer.Dial(wsURL, header)
	if err != nil {
		t.Fatalf("dial failed: %v resp=%v", err, resp)
	}
	defer conn.Close()

	// First binary message will grab the only semaphore slot and block in orchestrator.
	if err := conn.WriteMessage(websocket.BinaryMessage, []byte("RIFF....WAVE")); err != nil {
		t.Fatalf("write 1 failed: %v", err)
	}
	select {
	case <-started:
	case <-time.After(2 * time.Second):
		t.Fatalf("orchestrator did not start")
	}

	// Second message should be rejected immediately with an error because this
	// connection is already processing an audio request.
	if err := conn.WriteMessage(websocket.BinaryMessage, []byte("RIFF....WAVE")); err != nil {
		t.Fatalf("write 2 failed: %v", err)
	}

	conn.SetReadDeadline(time.Now().Add(2 * time.Second))
	_, msg, err := conn.ReadMessage()
	if err != nil {
		t.Fatalf("read failed: %v", err)
	}
	if !strings.Contains(string(msg), "Already processing") {
		t.Fatalf("expected already-processing error, got: %s", string(msg))
	}

	close(release)
}
