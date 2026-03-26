package auth

import (
	"net/http"
	"net/http/httptest"
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
	h := JWTMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotUserID = r.Header.Get("X-User-Id")
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
}
