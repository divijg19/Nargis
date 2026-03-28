package auth

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	jwt "github.com/golang-jwt/jwt/v5"
)

func makeToken(t *testing.T, secret string, claims jwt.MapClaims) string {
	t.Helper()
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := tok.SignedString([]byte(secret))
	if err != nil {
		t.Fatalf("failed to sign token: %v", err)
	}
	return signed
}

func TestJWTMiddlewareRejectsInvalidToken(t *testing.T) {
	t.Setenv("JWT_SECRET_KEY", "test-secret")

	nextCalled := false
	h := JWTMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		nextCalled = true
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/tasks", nil)
	req.Header.Set("Authorization", "Bearer invalid-token")
	rr := httptest.NewRecorder()

	h.ServeHTTP(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rr.Code)
	}
	if nextCalled {
		t.Fatal("expected next handler not to be called")
	}
}

func TestJWTMiddlewareInjectsUserIDHeader(t *testing.T) {
	t.Setenv("JWT_SECRET_KEY", "test-secret")

	token := makeToken(t, "test-secret", jwt.MapClaims{
		"sub": "user-123",
		"exp": time.Now().Add(5 * time.Minute).Unix(),
	})

	gotUserID := ""
	gotContextUserID := ""
	h := JWTMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotUserID = r.Header.Get("X-User-Id")
		if uid, ok := UserIDFromContext(r.Context()); ok {
			gotContextUserID = uid
		}
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/tasks", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	rr := httptest.NewRecorder()

	h.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rr.Code)
	}
	if gotUserID != "user-123" {
		t.Fatalf("expected X-User-Id to be user-123, got %q", gotUserID)
	}
	if gotContextUserID != "user-123" {
		t.Fatalf("expected context user id to be user-123, got %q", gotContextUserID)
	}
}

func TestJWTMiddlewareAllowsGuestHeader(t *testing.T) {
	gotUserID := ""
	gotContextUserID := ""
	h := JWTMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotUserID = r.Header.Get("X-User-Id")
		if uid, ok := UserIDFromContext(r.Context()); ok {
			gotContextUserID = uid
		}
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/tasks", nil)
	req.Header.Set("X-Guest-Id", "abc-123")
	rr := httptest.NewRecorder()

	h.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rr.Code)
	}
	if gotUserID != "guest_abc-123" {
		t.Fatalf("expected X-User-Id to be guest_abc-123, got %q", gotUserID)
	}
	if gotContextUserID != "guest_abc-123" {
		t.Fatalf("expected context user id to be guest_abc-123, got %q", gotContextUserID)
	}
}

func TestTracingMiddlewareInjectsRequestID(t *testing.T) {
	gotHeader := ""
	gotCtx := ""

	h := TracingMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotHeader = r.Header.Get(RequestIDHeader)
		if rid, ok := RequestIDFromContext(r.Context()); ok {
			gotCtx = rid
		}
		w.WriteHeader(http.StatusNoContent)
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/tasks", nil)
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)

	if rr.Code != http.StatusNoContent {
		t.Fatalf("expected 204, got %d", rr.Code)
	}
	if strings.TrimSpace(gotHeader) == "" {
		t.Fatal("expected request id header to be set")
	}
	if gotCtx != gotHeader {
		t.Fatalf("expected request id in context to match header, got ctx=%q header=%q", gotCtx, gotHeader)
	}
	if rr.Header().Get(RequestIDHeader) != gotHeader {
		t.Fatalf("expected response request id to match, got response=%q request=%q", rr.Header().Get(RequestIDHeader), gotHeader)
	}
}

func TestTracingMiddlewarePreservesIncomingRequestID(t *testing.T) {
	const incoming = "req-preserved-123"
	gotCtx := ""

	h := TracingMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if rid, ok := RequestIDFromContext(r.Context()); ok {
			gotCtx = rid
		}
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/tasks", nil)
	req.Header.Set(RequestIDHeader, incoming)
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)

	if gotCtx != incoming {
		t.Fatalf("expected context request id %q, got %q", incoming, gotCtx)
	}
	if rr.Header().Get(RequestIDHeader) != incoming {
		t.Fatalf("expected response request id %q, got %q", incoming, rr.Header().Get(RequestIDHeader))
	}
}
