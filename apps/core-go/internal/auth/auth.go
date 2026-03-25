package auth

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"
)

// CheckOrigin consults WS_ALLOWED_ORIGINS (comma-separated). If empty, allow all.
func CheckOrigin(r *http.Request) bool {
	allowed := os.Getenv("WS_ALLOWED_ORIGINS")
	allowed = strings.TrimSpace(allowed)
	if allowed == "" || allowed == "*" {
		// No restriction configured; allow (but log in debug scenarios)
		return true
	}
	origin := r.Header.Get("Origin")
	if origin == "" {
		// No Origin header; be conservative and reject
		return false
	}
	// compare against comma-separated list
	for _, o := range strings.Split(allowed, ",") {
		o = strings.TrimSpace(o)
		if o == "" {
			continue
		}
		if strings.EqualFold(o, origin) {
			return true
		}
	}
	return false
}

// VerifyJWTToken validates a JWT string using HS256 when JWT_SECRET_KEY is set.
// Returns the resolved user id (sub/user_id/uid) or empty string if unverifiable/absent.
func VerifyJWTToken(token string) (string, error) {
	secret := os.Getenv("JWT_SECRET_KEY")
	if strings.TrimSpace(secret) == "" {
		// Backwards-compatible fallback for older env name
		secret = os.Getenv("JWT_HMAC_SECRET")
	}
	if strings.TrimSpace(secret) == "" {
		// JWT validation not enabled
		return "", nil
	}
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return "", errors.New("invalid token format")
	}

	signingInput := parts[0] + "." + parts[1]
	sig, err := base64.RawURLEncoding.DecodeString(parts[2])
	if err != nil {
		return "", fmt.Errorf("invalid signature encoding: %w", err)
	}

	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(signingInput))
	expected := mac.Sum(nil)
	if !hmac.Equal(sig, expected) {
		return "", errors.New("invalid token signature")
	}

	payload, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return "", fmt.Errorf("invalid payload encoding: %w", err)
	}
	var claims map[string]interface{}
	if err := json.Unmarshal(payload, &claims); err != nil {
		return "", fmt.Errorf("invalid payload json: %w", err)
	}

	// If `exp` claim is present, enforce it.
	// We accept numeric unix seconds (common JWT encoding).
	if expRaw, ok := claims["exp"]; ok {
		switch v := expRaw.(type) {
		case float64:
			if time.Now().Unix() >= int64(v) {
				return "", errors.New("token expired")
			}
		case int64:
			if time.Now().Unix() >= v {
				return "", errors.New("token expired")
			}
		case int:
			if time.Now().Unix() >= int64(v) {
				return "", errors.New("token expired")
			}
		case json.Number:
			if n, err := v.Int64(); err == nil {
				if time.Now().Unix() >= n {
					return "", errors.New("token expired")
				}
			}
		}
	}

	// Prefer standard `sub`, then `user_id`, then `uid`.
	if sub, ok := claims["sub"].(string); ok && sub != "" {
		return sub, nil
	}
	if uid, ok := claims["user_id"].(string); ok && uid != "" {
		return uid, nil
	}
	if uidf, ok := claims["uid"].(float64); ok {
		return fmt.Sprintf("%.0f", uidf), nil
	}
	return "", nil
}

// VerifyJWTFromRequest optionally validates a JWT from header or query param when JWT_SECRET_KEY is set.
// If no secret is configured, JWT validation is a no-op and returns ("", nil).
// On success it returns the resolved user id to propagate downstream (sub/user_id/uid).
func VerifyJWTFromRequest(r *http.Request) (string, error) {
	// Prefer Authorization header if present
	auth := r.Header.Get("Authorization")
	if strings.HasPrefix(auth, "Bearer ") {
		tok := strings.TrimPrefix(auth, "Bearer ")
		return VerifyJWTToken(tok)
	}
	// Avoid query-string tokens by default (they can leak via logs/history).
	// If you must support them for tooling, set WS_ALLOW_QUERY_TOKEN=1.
	if os.Getenv("WS_ALLOW_QUERY_TOKEN") == "1" {
		if tok := r.URL.Query().Get("token"); strings.TrimSpace(tok) != "" {
			return VerifyJWTToken(tok)
		}
	}
	// Fallback to cookie `access_token` for browser clients
	if c, err := r.Cookie("access_token"); err == nil {
		if strings.TrimSpace(c.Value) != "" {
			return VerifyJWTToken(c.Value)
		}
	}
	// Nothing to verify
	return "", nil
}

// ParseJWTClaims verifies the Authorization: Bearer <token> header (if present)
// using the same HS256 secret (`JWT_SECRET_KEY`) and returns the decoded claims map. If no
// token or secret is configured this returns (nil, nil). On verification
// error an error is returned.
func ParseJWTClaims(r *http.Request) (map[string]interface{}, error) {
	secret := os.Getenv("JWT_SECRET_KEY")
	if strings.TrimSpace(secret) == "" {
		return nil, nil
	}
	auth := r.Header.Get("Authorization")
	if auth == "" {
		// Fallback to cookie if Authorization header is missing
		if c, err := r.Cookie("access_token"); err == nil {
			if strings.TrimSpace(c.Value) != "" {
				auth = "Bearer " + c.Value
			} else {
				return nil, nil
			}
		} else {
			return nil, nil
		}
	}
	if !strings.HasPrefix(auth, "Bearer ") {
		return nil, errors.New("invalid authorization header")
	}
	token := strings.TrimPrefix(auth, "Bearer ")
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return nil, errors.New("invalid token format")
	}
	signingInput := parts[0] + "." + parts[1]
	sig, err := base64.RawURLEncoding.DecodeString(parts[2])
	if err != nil {
		return nil, fmt.Errorf("invalid signature encoding: %w", err)
	}
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(signingInput))
	expected := mac.Sum(nil)
	if !hmac.Equal(sig, expected) {
		return nil, errors.New("invalid token signature")
	}
	payload, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return nil, fmt.Errorf("invalid payload encoding: %w", err)
	}
	var claims map[string]interface{}
	if err := json.Unmarshal(payload, &claims); err != nil {
		return nil, fmt.Errorf("invalid payload json: %w", err)
	}
	return claims, nil
}
