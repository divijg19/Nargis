package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/divijg19/Nargis/gateway/internal/auth"
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

func TestGatewayCookieWSAuthIntegration(t *testing.T) {
	// Simpler WS test: verify gateway accepts cookie on upgrade and we can echo the resolved user id.
	secret := "test-hmac-secret"
	os.Setenv("JWT_HMAC_SECRET", secret)

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
	os.Setenv("JWT_HMAC_SECRET", secret)

	// fake orchestrator as above
	orch := httptest.NewServer(http.HandlerFunc(fakeOrchestrator))
	defer orch.Close()
	os.Setenv("ORCHESTRATOR_URL", orch.URL)

	// Start gateway mux with proxy handler
	mux := http.NewServeMux()
	mux.HandleFunc("/proxy/process-audio", proxyProcessAudioHandler)
	srv := httptest.NewServer(mux)
	defer srv.Close()

	// Build POST request to proxy with cookie
	client := &http.Client{Timeout: 3 * time.Second}
	req, err := http.NewRequest("POST", srv.URL+"/proxy/process-audio", strings.NewReader("dummy"))
	if err != nil {
		t.Fatalf("failed create req: %v", err)
	}
	req.Header.Set("Content-Type", "multipart/form-data; boundary=foo")
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
	os.Setenv("JWT_HMAC_SECRET", secret)

	// Start fake orchestrator server that emits NDJSON
	orch := httptest.NewServer(http.HandlerFunc(fakeOrchestrator))
	defer orch.Close()
	os.Setenv("ORCHESTRATOR_URL", orch.URL)

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
	if err := conn.WriteMessage(websocket.BinaryMessage, []byte{0x1}); err != nil {
		t.Fatalf("write chunk failed: %v", err)
	}
	if err := conn.WriteMessage(websocket.BinaryMessage, []byte{0x2}); err != nil {
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
